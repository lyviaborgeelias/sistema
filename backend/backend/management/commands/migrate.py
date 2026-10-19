from django.core.management.commands.migrate import Command as DjangoMigrateCommand
from django.core.management import call_command


class Command(DjangoMigrateCommand):
    """Reconhece as tabelas iniciais importadas pelo saep_db.sql."""

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.set_defaults(fake_initial=True)

    def handle(self, *args, **options):
        result = super().handle(*args, **options)
        if not any(options.get(key) for key in ('plan', 'check_unapplied', 'prune', 'app_label', 'migration_name')):
            call_command('sincronizar_cpfs', database=options['database'], stdout=self.stdout)
        return result
