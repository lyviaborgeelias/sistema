from cryptography.fernet import InvalidToken
from django.core.management.base import BaseCommand, CommandError
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction

from backend.models import Tutor, descriptografar_cpf, hash_consulta_cpf, validar_cpf


class Command(BaseCommand):
    help = "Sincroniza os índices de CPF após importar o SQL, sem alterar os CPFs cifrados."

    def add_arguments(self, parser):
        parser.add_argument('--database', default='default')

    def handle(self, *args, **options):
        database = options['database']
        with transaction.atomic(using=database):
            tutores = list(Tutor.objects.using(database).select_for_update().all())
            vistos = set()
            alterados = []
            for tutor in tutores:
                try:
                    cpf = descriptografar_cpf(tutor.cpf_encrypted)
                    if not validar_cpf(cpf):
                        raise ValueError('CPF inválido')
                    digest = hash_consulta_cpf(cpf)
                except (InvalidToken, ImproperlyConfigured, ValueError, UnicodeError) as exc:
                    raise CommandError(
                        f'Não foi possível validar o CPF do tutor ID {tutor.pk}. '
                        'Confira as chaves de CPF no .env. Nenhum índice foi alterado.'
                    ) from exc
                if digest in vistos:
                    raise CommandError('Existem CPFs duplicados. Nenhum índice foi alterado.')
                vistos.add(digest)
                if tutor.cpf_lookup_hash != digest:
                    tutor.cpf_lookup_hash = digest
                    alterados.append(tutor)
            Tutor.objects.using(database).bulk_update(alterados, ['cpf_lookup_hash'])
        self.stdout.write(self.style.SUCCESS(f'Índices de CPF sincronizados: {len(alterados)}.'))
