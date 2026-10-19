import hashlib
import hmac
import re

from cryptography.fernet import Fernet
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.db import models


def normalizar_cpf(cpf):
    return re.sub(r"\D", "", str(cpf or ""))


def validar_cpf(cpf):
    numero = normalizar_cpf(cpf)
    if len(numero) != 11 or numero == numero[0] * 11:
        return False
    for tamanho in (9, 10):
        soma = sum(int(numero[indice]) * (tamanho + 1 - indice) for indice in range(tamanho))
        resto = (soma * 10) % 11
        digito = 0 if resto == 10 else resto
        if digito != int(numero[tamanho]):
            return False
    return True


def _fernet():
    if not settings.CPF_ENCRYPTION_KEY:
        raise ImproperlyConfigured("Configure CPF_ENCRYPTION_KEY no arquivo de ambiente.")
    try:
        return Fernet(settings.CPF_ENCRYPTION_KEY.encode("ascii"))
    except (ValueError, TypeError) as erro:
        raise ImproperlyConfigured("CPF_ENCRYPTION_KEY não é uma chave Fernet válida.") from erro


def criptografar_cpf(cpf):
    return _fernet().encrypt(normalizar_cpf(cpf).encode("ascii")).decode("ascii")


def descriptografar_cpf(cpf_encrypted):
    return _fernet().decrypt(cpf_encrypted.encode("ascii")).decode("ascii")


def hash_consulta_cpf(cpf):
    if not settings.CPF_LOOKUP_KEY:
        raise ImproperlyConfigured("Configure CPF_LOOKUP_KEY no arquivo de ambiente.")
    chave = settings.CPF_LOOKUP_KEY.encode("utf-8")
    return hmac.new(chave, normalizar_cpf(cpf).encode("ascii"), hashlib.sha256).hexdigest()


def mascarar_cpf(cpf_encrypted):
    try:
        cpf = descriptografar_cpf(cpf_encrypted)
        return f"***.***.***-{cpf[-2:]}"
    except Exception:
        return "***.***.***-**"


class Tutor(models.Model):
    nome = models.CharField(max_length=150)
    cpf_encrypted = models.TextField()
    cpf_lookup_hash = models.CharField(max_length=64, unique=True)
    senha_hash = models.CharField(max_length=128)
    telefone = models.CharField(max_length=20)
    email = models.EmailField(max_length=254)
    endereco = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tutores_tutor"
        ordering = ["nome"]
        verbose_name = "Tutor"
        verbose_name_plural = "Tutores"

    @property
    def cpf_mascarado(self):
        return mascarar_cpf(self.cpf_encrypted)

    def __str__(self):
        return self.nome


class Pet(models.Model):
    SEXO_CHOICES = [("M", "Macho"), ("F", "Fêmea"), ("N", "Não informado")]

    tutor = models.ForeignKey(Tutor, on_delete=models.PROTECT, related_name="pets")
    nome = models.CharField(max_length=100)
    especie = models.CharField(max_length=60)
    raca = models.CharField(max_length=80, blank=True)
    sexo = models.CharField(max_length=1, choices=SEXO_CHOICES, default="N")
    data_nascimento = models.DateField(null=True, blank=True)
    observacoes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pets_pet"
        ordering = ["nome"]
        verbose_name = "Pet"
        verbose_name_plural = "Pets"

    def __str__(self):
        return f"{self.nome} ({self.tutor.nome})"


class Agendamento(models.Model):
    STATUS_CHOICES = [
        ("pendente", "Pendente"),
        ("confirmado", "Confirmado"),
        ("concluido", "Concluído"),
        ("cancelado", "Cancelado"),
    ]

    tutor = models.ForeignKey(Tutor, on_delete=models.PROTECT, related_name="agendamentos")
    pet = models.ForeignKey(Pet, on_delete=models.PROTECT, related_name="agendamentos")
    data_agendamento = models.DateTimeField()
    motivo = models.CharField(max_length=180)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="pendente")
    observacoes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "agendamentos_agendamento"
        ordering = ["data_agendamento", "id"]
        verbose_name = "Agendamento"
        verbose_name_plural = "Agendamentos"

    def clean(self):
        if self.tutor_id and self.pet_id and self.pet.tutor_id != self.tutor_id:
            raise ValidationError({"pet": "O pet selecionado não pertence ao tutor informado."})

    def __str__(self):
        return f"{self.pet.nome} - {self.data_agendamento:%d/%m/%Y %H:%M}"
