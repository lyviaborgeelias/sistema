from pathlib import Path
import os
import subprocess
import sys
import unittest


class MigrateTests(unittest.TestCase):
    def run_migrate(self, imported):
        code = """
import django
django.setup()
from django.core.management import call_command, get_commands
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.db.migrations.recorder import MigrationRecorder
assert get_commands()['migrate'] == 'backend'
executor = MigrationExecutor(connection)
state = executor.loader.project_state([('sistema', '0001_initial')])
Tutor = state.apps.get_model('sistema', 'Tutor')
if IMPORTED:
    with connection.schema_editor() as editor:
        for name in ('Tutor', 'Pet', 'Agendamento'):
            editor.create_model(state.apps.get_model('sistema', name))
    from backend.models import criptografar_cpf, hash_consulta_cpf
    Tutor.objects.create(nome='Registro preservado', cpf_encrypted=criptografar_cpf('00000000191'), cpf_lookup_hash='indice-antigo')
call_command('migrate', interactive=False, verbosity=0)
assert ('sistema', '0001_initial') in MigrationRecorder(connection).applied_migrations()
assert Tutor.objects.count() == (1 if IMPORTED else 0)
if IMPORTED:
    assert Tutor.objects.get().nome == 'Registro preservado'
    assert Tutor.objects.get().cpf_lookup_hash == hash_consulta_cpf('00000000191')
call_command('migrate', interactive=False, verbosity=0)
assert Tutor.objects.count() == (1 if IMPORTED else 0)
""".replace('IMPORTED', repr(imported))
        env = dict(os.environ, DJANGO_SETTINGS_MODULE='core.settings', TEST_SQLITE='1',
                   SECRET_KEY='migration-test', DEBUG='True')
        result = subprocess.run([sys.executable, '-c', code],
                                cwd=Path(__file__).resolve().parent,
                                env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_empty_database(self):
        self.run_migrate(False)

    def test_existing_tables_preserve_data(self):
        self.run_migrate(True)


if __name__ == '__main__':
    unittest.main()
