from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.db import IntegrityError
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from .admin import TutorAdminForm
from .models import Agendamento, Pet, Tutor, criptografar_cpf, descriptografar_cpf, hash_consulta_cpf


def cpf_de_teste(base):
    digitos = [int(digito) for digito in str(base).zfill(9)[:9]]
    for tamanho in (9, 10):
        soma = sum(digito * (tamanho + 1 - indice) for indice, digito in enumerate(digitos))
        resto = (soma * 10) % 11
        digitos.append(0 if resto == 10 else resto)
    return "".join(str(digito) for digito in digitos)


@override_settings(SESSION_COOKIE_SECURE=False, CSRF_COOKIE_SECURE=False)
class AutenticacaoTests(TestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_user(
            username="avaliador", password="Senha@2026", first_name="Pessoa", last_name="Avaliadora"
        )
        self.client_csrf = Client(enforce_csrf_checks=True)

    def login_com_csrf(self):
        resposta = self.client_csrf.get("/api/auth/csrf/")
        token = resposta.json()["csrfToken"]
        return self.client_csrf.post(
            "/api/auth/login/",
            data='{"username":"avaliador","password":"Senha@2026"}',
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )

    def test_login_valido_cria_sessao_e_me_retorna_nome_real(self):
        resposta = self.login_com_csrf()
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("sessionid", resposta.cookies)
        self.assertTrue(resposta.cookies["sessionid"]["httponly"])
        self.assertEqual(resposta.cookies["sessionid"]["samesite"], "Lax")
        self.assertFalse(resposta.json()["usuario"]["is_admin"])
        me = self.client_csrf.get("/api/auth/me/")
        self.assertEqual(me.json()["nome"], "Pessoa Avaliadora")
        self.assertFalse(me.json()["is_admin"])

    def test_superusuario_entra_pela_origem_padrao_do_frontend(self):
        get_user_model().objects.create_superuser(username="administrador", password="Senha@2026")
        origem = "http://127.0.0.1:5173"
        csrf = self.client_csrf.get("/api/auth/csrf/", HTTP_ORIGIN=origem)
        self.assertEqual(csrf.headers.get("Access-Control-Allow-Origin"), origem)
        resposta = self.client_csrf.post(
            "/api/auth/login/", {"username": "administrador", "password": "Senha@2026"},
            content_type="application/json", HTTP_ORIGIN=origem,
            HTTP_X_CSRFTOKEN=csrf.json()["csrfToken"],
        )
        self.assertEqual(resposta.status_code, 200, resposta.content)
        self.assertEqual(resposta.headers.get("Access-Control-Allow-Origin"), origem)
        self.assertEqual(resposta.headers.get("Access-Control-Allow-Credentials"), "true")
        self.assertTrue(resposta.json()["usuario"]["is_admin"])
        me = self.client_csrf.get("/api/auth/me/", HTTP_ORIGIN=origem)
        self.assertEqual(me.status_code, 200)
        self.assertTrue(me.json()["is_admin"])

    def test_login_recusa_origem_nao_autorizada(self):
        token = self.client_csrf.get("/api/auth/csrf/").json()["csrfToken"]
        resposta = self.client_csrf.post(
            "/api/auth/login/", {"username": "avaliador", "password": "Senha@2026"},
            content_type="application/json", HTTP_ORIGIN="http://origem-nao-autorizada.example",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(resposta.status_code, 403)
        self.assertNotIn("Access-Control-Allow-Origin", resposta.headers)

    def test_papel_admin_depende_somente_de_superusuario_no_login_e_me(self):
        for staff, superusuario in ((True, False), (True, True), (False, True)):
            with self.subTest(is_staff=staff, is_superuser=superusuario):
                self.usuario.is_staff = staff
                self.usuario.is_superuser = superusuario
                self.usuario.save(update_fields=["is_staff", "is_superuser"])
                resposta = self.login_com_csrf()
                self.assertEqual(resposta.status_code, 200)
                self.assertEqual(resposta.json()["usuario"]["is_admin"], superusuario)
                self.assertEqual(self.client_csrf.get("/api/auth/me/").json()["is_admin"], superusuario)

    def test_login_invalido_nao_revela_se_usuario_existe(self):
        csrf = self.client_csrf.get("/api/auth/csrf/").json()["csrfToken"]
        resposta = self.client_csrf.post(
            "/api/auth/login/", data='{"username":"inexistente","password":"errada"}', content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf,
        )
        resposta_existente = self.client_csrf.post(
            "/api/auth/login/", data='{"username":"avaliador","password":"errada"}', content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf,
        )
        self.assertEqual(resposta.status_code, 401)
        self.assertEqual(resposta.json(), resposta_existente.json())

    def test_login_exige_campos_e_protecao_csrf(self):
        sem_campos = self.client_csrf.post("/api/auth/login/", data="{}", content_type="application/json")
        self.assertEqual(sem_campos.status_code, 403)
        token = self.client_csrf.get("/api/auth/csrf/").json()["csrfToken"]
        vazio = self.client_csrf.post(
            "/api/auth/login/", data="{}", content_type="application/json", HTTP_X_CSRFTOKEN=token
        )
        nao_objeto = self.client_csrf.post(
            "/api/auth/login/", data="[]", content_type="application/json", HTTP_X_CSRFTOKEN=token
        )
        incompleto = self.client_csrf.post(
            "/api/auth/login/", data='{"username":"avaliador"}', content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(vazio.status_code, 400)
        self.assertEqual(nao_objeto.status_code, 400)
        self.assertEqual(incompleto.status_code, 400)

    def test_logout_invalida_sessao_e_rota_protegida(self):
        self.login_com_csrf()
        token = self.client_csrf.cookies["csrftoken"].value
        resposta = self.client_csrf.post("/api/auth/logout/", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(self.client_csrf.get("/api/auth/me/").status_code, 401)
        self.assertEqual(self.client_csrf.get("/api/tutores/").status_code, 403)

    def test_sessao_expirada_nao_autentica_usuario(self):
        self.client.force_login(self.usuario)
        sessao = self.client.session
        sessao.set_expiry(-1)
        sessao.save()
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)


@override_settings(SESSION_COOKIE_SECURE=False, CSRF_COOKIE_SECURE=False)
class CadastroUsuarioTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.csrf = self.client.get("/api/auth/csrf/").json()["csrfToken"]

    def dados(self, **alteracoes):
        return {
            "nome": "Pessoa Cadastrada", "username": "nova.pessoa", "email": "pessoa@example.com",
            "password": "Cadastro!2026Seguro", "password_confirm": "Cadastro!2026Seguro", **alteracoes,
        }

    def cadastrar(self, **alteracoes):
        return self.client.post(
            "/api/auth/register/", self.dados(**alteracoes), content_type="application/json", HTTP_X_CSRFTOKEN=self.csrf
        )

    def test_cadastro_cria_usuario_com_senha_hash_sem_sessao(self):
        resposta = self.cadastrar()
        self.assertEqual(resposta.status_code, 201, resposta.content)
        usuario = get_user_model().objects.get(username="nova.pessoa")
        self.assertEqual(usuario.get_full_name(), "Pessoa Cadastrada")
        self.assertEqual(usuario.email, "pessoa@example.com")
        self.assertTrue(usuario.check_password(self.dados()["password"]))
        self.assertNotEqual(usuario.password, self.dados()["password"])
        self.assertEqual(set(resposta.json()["usuario"]), {"id", "username", "nome", "email", "is_admin"})
        self.assertFalse(resposta.json()["usuario"]["is_admin"])
        self.assertNotIn("password", resposta.content.decode())
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_flags_de_administrador_do_payload_sao_ignoradas(self):
        resposta = self.cadastrar(is_staff=True, is_superuser=True, is_admin=True)
        self.assertEqual(resposta.status_code, 201, resposta.content)
        usuario = get_user_model().objects.get(username="nova.pessoa")
        self.assertFalse(usuario.is_staff)
        self.assertFalse(usuario.is_superuser)
        self.assertFalse(resposta.json()["usuario"]["is_admin"])

    def test_username_duplicado_ignora_maiusculas(self):
        get_user_model().objects.create_user(username="Nova.Pessoa", password="Senha@2026")
        resposta = self.cadastrar()
        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(resposta.json()["username"], ["Este usuário já está cadastrado."])
        self.assertEqual(get_user_model().objects.count(), 1)

    def test_corrida_de_duplicidade_retorna_erro_de_campo_sem_quebrar_transacao(self):
        with patch.object(type(get_user_model().objects), "create_user", side_effect=IntegrityError("duplicate")):
            resposta = self.cadastrar()
        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(resposta.json()["username"], ["Este usuário já está cadastrado."])
        self.assertFalse(get_user_model().objects.exists())

    def test_cadastro_valida_nome_username_email_senha_e_confirmacao(self):
        casos = [
            ("nome", ""), ("nome", "a" * 151), ("username", "nome inválido!"),
            ("username", "a" * 151), ("email", "email-invalido"), ("password_confirm", "outra-senha"),
        ]
        for campo, valor in casos:
            with self.subTest(campo=campo, valor=valor):
                resposta = self.cadastrar(**{campo: valor})
                self.assertEqual(resposta.status_code, 400, resposta.content)
                self.assertIn(campo, resposta.json())
        fraca = self.cadastrar(password="1234", password_confirm="1234")
        self.assertEqual(fraca.status_code, 400)
        self.assertIn("password", fraca.json())
        self.assertFalse(get_user_model().objects.exists())

    def test_cadastro_exige_csrf_e_objeto_json_com_campos_obrigatorios(self):
        sem_csrf = self.client.post("/api/auth/register/", self.dados(), content_type="application/json")
        self.assertEqual(sem_csrf.status_code, 403)
        for conteudo in ("{", "[]", "null", '"texto"', "{}"):
            with self.subTest(conteudo=conteudo):
                resposta = self.client.post(
                    "/api/auth/register/", conteudo, content_type="application/json", HTTP_X_CSRFTOKEN=self.csrf
                )
                self.assertEqual(resposta.status_code, 400)
        self.assertEqual(self.client.get("/api/auth/register/").status_code, 405)
        self.assertFalse(get_user_model().objects.exists())


@override_settings(CPF_ENCRYPTION_KEY="BO8mpA0QOe8JyAJPmnorrGsV5C9lJBLyD_vf-axTJeA=", CPF_LOOKUP_KEY="chave-de-teste")
class TutorTests(TestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_superuser(username="teste", password="Senha@2026")
        self.client.force_login(self.usuario)

    def dados(self, base="000000001", **alteracoes):
        return {
            "nome": "Tutor de Teste",
            "cpf": cpf_de_teste(base),
            "senha": "Tutor@2026",
            "telefone": "11999990000",
            "email": "tutor@example.com",
            "endereco": "Rua de Teste, 1",
            **alteracoes,
        }

    def criar(self, base="000000001", **alteracoes):
        return self.client.post("/api/tutores/", self.dados(base, **alteracoes), content_type="application/json")

    def test_cadastro_valido_criptografa_cpf_e_hash_da_senha(self):
        resposta = self.criar()
        self.assertEqual(resposta.status_code, 201, resposta.content)
        tutor = Tutor.objects.get()
        cpf = self.dados()["cpf"]
        self.assertNotEqual(tutor.cpf_encrypted, cpf)
        self.assertNotIn(cpf, tutor.cpf_encrypted)
        self.assertEqual(descriptografar_cpf(tutor.cpf_encrypted), cpf)
        self.assertTrue(check_password("Tutor@2026", tutor.senha_hash))
        self.assertNotEqual(tutor.senha_hash, "Tutor@2026")
        self.assertNotIn(cpf, resposta.content.decode())
        self.assertNotIn("senha_hash", resposta.content.decode())
        self.assertNotIn("senha", resposta.content.decode())

    def test_cadastro_rejeita_cpf_invalido_ou_duplicado(self):
        invalido = self.criar(base="000000000")
        self.assertEqual(invalido.status_code, 400)
        self.assertEqual(self.criar().status_code, 201)
        duplicado = self.criar(base="000000001", nome="Outro nome")
        self.assertEqual(duplicado.status_code, 400)

    def test_busca_lista_mascarado_e_nao_entrega_dados_de_seguranca(self):
        self.criar()
        resposta = self.client.get("/api/tutores/?search=Tutor%20de%20Teste")
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(len(resposta.json()), 1)
        self.assertEqual(resposta.json()[0]["cpf_mascarado"], "***.***.***-91")
        self.assertEqual(self.client.get("/api/tutores/?search=nao-encontrado").json(), [])

    def test_edicao_persiste_e_senha_vazia_mantem_hash(self):
        self.criar()
        tutor = Tutor.objects.get()
        senha_antiga = tutor.senha_hash
        resposta = self.client.patch(
            f"/api/tutores/{tutor.pk}/", {"nome": "Nome Atualizado", "senha": ""}, content_type="application/json"
        )
        self.assertEqual(resposta.status_code, 200, resposta.content)
        tutor.refresh_from_db()
        self.assertEqual(tutor.nome, "Nome Atualizado")
        self.assertEqual(tutor.senha_hash, senha_antiga)

    def test_exclusao_de_tutor_sem_relacoes(self):
        self.criar()
        tutor = Tutor.objects.get()
        resposta = self.client.delete(f"/api/tutores/{tutor.pk}/")
        self.assertEqual(resposta.status_code, 204)
        self.assertFalse(Tutor.objects.exists())

    def test_exclusao_de_tutor_com_pet_retorna_mensagem_clara(self):
        self.criar()
        tutor = Tutor.objects.get()
        Pet.objects.create(tutor=tutor, nome="Bidu", especie="Cachorro")
        resposta = self.client.delete(f"/api/tutores/{tutor.pk}/")
        self.assertEqual(resposta.status_code, 400)
        self.assertIn("Não é possível excluir", resposta.content.decode())
        self.assertTrue(Tutor.objects.filter(pk=tutor.pk).exists())

    def test_admin_cadastra_tutor_com_cpf_cifrado_e_senha_com_hash(self):
        cpf = self.dados()["cpf"]
        formulario = TutorAdminForm(data={
            "nome": "Tutor pelo Admin", "cpf": cpf, "senha": "Tutor@2026",
            "telefone": "11999990000", "email": "admin@example.com", "endereco": "Rua A",
        })
        self.assertTrue(formulario.is_valid(), formulario.errors)
        tutor = formulario.save()
        self.assertNotEqual(tutor.cpf_encrypted, cpf)
        self.assertTrue(check_password("Tutor@2026", tutor.senha_hash))

        edicao = TutorAdminForm(data={
            "nome": "Nome Atualizado", "cpf": "", "senha": "",
            "telefone": tutor.telefone, "email": tutor.email, "endereco": tutor.endereco,
        }, instance=tutor)
        self.assertTrue(edicao.is_valid(), edicao.errors)
        edicao.save()
        tutor.refresh_from_db()
        self.assertEqual(tutor.nome, "Nome Atualizado")
        self.assertEqual(descriptografar_cpf(tutor.cpf_encrypted), cpf)
        self.assertTrue(check_password("Tutor@2026", tutor.senha_hash))

@override_settings(CPF_ENCRYPTION_KEY="BO8mpA0QOe8JyAJPmnorrGsV5C9lJBLyD_vf-axTJeA=", CPF_LOOKUP_KEY="chave-de-teste")
class PetTests(TestCase):
    def setUp(self):
        usuario = get_user_model().objects.create_superuser(username="teste", password="Senha@2026")
        self.client.force_login(usuario)
        cpf = cpf_de_teste("000000001")
        self.tutor = Tutor.objects.create(
            nome="Tutor", cpf_encrypted=criptografar_cpf(cpf), cpf_lookup_hash=hash_consulta_cpf(cpf),
            senha_hash=make_password("Tutor@2026"), telefone="11999990000", email="tutor@example.com", endereco="Rua A",
        )

    def test_cadastro_pet_vincula_tutor_e_responde_nome(self):
        resposta = self.client.post(
            "/api/pets/", {"tutor": self.tutor.pk, "nome": "Bidu", "especie": "Cachorro", "raca": "SRD", "sexo": "M"},
            content_type="application/json",
        )
        self.assertEqual(resposta.status_code, 201, resposta.content)
        self.assertEqual(resposta.json()["tutor"], self.tutor.pk)
        self.assertEqual(resposta.json()["tutor_nome"], "Tutor")

    def test_rejeita_tutor_inexistente(self):
        resposta = self.client.post(
            "/api/pets/", {"tutor": 9999, "nome": "Bidu", "especie": "Cachorro"}, content_type="application/json"
        )
        self.assertEqual(resposta.status_code, 400)


@override_settings(CPF_ENCRYPTION_KEY="BO8mpA0QOe8JyAJPmnorrGsV5C9lJBLyD_vf-axTJeA=", CPF_LOOKUP_KEY="chave-de-teste")
class AgendamentoTests(TestCase):
    def setUp(self):
        usuario = get_user_model().objects.create_superuser(username="teste", password="Senha@2026")
        self.client.force_login(usuario)
        self.tutor = self.criar_tutor("000000001", "Tutor A")
        self.outro_tutor = self.criar_tutor("000000002", "Tutor B")
        self.pet = Pet.objects.create(tutor=self.tutor, nome="Bidu", especie="Cachorro")
        self.outro_pet = Pet.objects.create(tutor=self.outro_tutor, nome="Mimi", especie="Gato")

    def criar_tutor(self, base, nome):
        cpf = cpf_de_teste(base)
        return Tutor.objects.create(
            nome=nome, cpf_encrypted=criptografar_cpf(cpf), cpf_lookup_hash=hash_consulta_cpf(cpf),
            senha_hash=make_password("Tutor@2026"), telefone="11999990000", email=f"{base}@example.com", endereco="Rua A",
        )

    def dados(self, pet=None, tutor=None, data=None):
        return {
            "tutor": (tutor or self.tutor).pk,
            "pet": (pet or self.pet).pk,
            "data_agendamento": (data or timezone.now() + timedelta(days=1)).isoformat(),
            "motivo": "Consulta de rotina",
            "status": "pendente",
        }

    def test_cadastro_rejeita_pet_de_outro_tutor(self):
        resposta = self.client.post(
            "/api/agendamentos/", self.dados(pet=self.outro_pet), content_type="application/json"
        )
        self.assertEqual(resposta.status_code, 400)

    def test_lista_ordenada_com_dados_relacionados_e_atualizacao_persistida(self):
        self.pet.data_nascimento = "2022-03-15"
        self.pet.observacoes = "Observação do pet"
        self.pet.save()
        primeiro = timezone.now() + timedelta(days=1)
        segundo = timezone.now() + timedelta(days=2)
        Agendamento.objects.create(tutor=self.tutor, pet=self.pet, data_agendamento=segundo, motivo="Retorno")
        Agendamento.objects.create(tutor=self.tutor, pet=self.pet, data_agendamento=primeiro, motivo="Consulta")
        resposta = self.client.get("/api/agendamentos/")
        self.assertEqual(resposta.status_code, 200)
        dados = resposta.json()
        self.assertLess(dados[0]["data_agendamento"], dados[1]["data_agendamento"])
        self.assertEqual(dados[0]["tutor_nome"], "Tutor A")
        self.assertEqual(dados[0]["tutor_telefone"], "11999990000")
        self.assertEqual(dados[0]["tutor_cpf_mascarado"], "***.***.***-91")
        self.assertEqual(dados[0]["pet_nome"], "Bidu")
        self.assertEqual(dados[0]["tutor_endereco"], "Rua A")
        self.assertEqual(dados[0]["pet_data_nascimento"], "2022-03-15")
        self.assertEqual(dados[0]["pet_observacoes"], "Observação do pet")
        self.assertNotIn("senha_hash", dados[0])
        self.assertNotIn("cpf_encrypted", dados[0])
        novo_horario = timezone.now() + timedelta(days=5)
        atualizacao = self.client.patch(
            f"/api/agendamentos/{dados[0]['id']}/", {"data_agendamento": novo_horario.isoformat()}, content_type="application/json"
        )
        self.assertEqual(atualizacao.status_code, 200, atualizacao.content)
        self.assertEqual(self.client.get(f"/api/agendamentos/{dados[0]['id']}/").json()["data_agendamento"], atualizacao.json()["data_agendamento"])


@override_settings(CPF_ENCRYPTION_KEY="BO8mpA0QOe8JyAJPmnorrGsV5C9lJBLyD_vf-axTJeA=", CPF_LOOKUP_KEY="chave-de-teste")
class PermissoesTests(TestCase):
    def setUp(self):
        self.comum = get_user_model().objects.create_user(username="consulta")
        self.staff = get_user_model().objects.create_user(username="staff", is_staff=True)
        self.admin = get_user_model().objects.create_superuser(username="gestao")
        cpf = cpf_de_teste("000000001")
        self.tutor = Tutor.objects.create(
            nome="Tutor", cpf_encrypted=criptografar_cpf(cpf), cpf_lookup_hash=hash_consulta_cpf(cpf),
            senha_hash=make_password("Tutor@2026"), telefone="11999990000", email="tutor@example.com", endereco="Rua A",
        )
        self.pet = Pet.objects.create(tutor=self.tutor, nome="Bidu", especie="Cachorro")
        self.agendamento = Agendamento.objects.create(
            tutor=self.tutor, pet=self.pet, data_agendamento=timezone.now() + timedelta(days=1), motivo="Consulta",
        )
        self.modulos = {"tutores": self.tutor, "pets": self.pet, "agendamentos": self.agendamento}

    def test_usuarios_comuns_e_staff_podem_ler_todos_os_modulos(self):
        for usuario in (self.comum, self.staff):
            self.client.force_login(usuario)
            for modulo, registro in self.modulos.items():
                for url in (f"/api/{modulo}/", f"/api/{modulo}/{registro.pk}/"):
                    for metodo in ("get", "head", "options"):
                        with self.subTest(usuario=usuario.username, metodo=metodo, url=url):
                            resposta = getattr(self.client, metodo)(url)
                            self.assertEqual(resposta.status_code, 200, resposta.content)
            self.assertEqual(self.client.get("/api/resumo/").status_code, 200)

    def test_usuarios_comuns_e_staff_nao_podem_escrever_em_nenhum_modulo(self):
        for usuario in (self.comum, self.staff):
            self.client.force_login(usuario)
            for modulo, registro in self.modulos.items():
                for metodo in ("post", "put", "patch", "delete"):
                    url = f"/api/{modulo}/" if metodo == "post" else f"/api/{modulo}/{registro.pk}/"
                    with self.subTest(usuario=usuario.username, metodo=metodo, url=url):
                        resposta = getattr(self.client, metodo)(url, {}, content_type="application/json")
                        self.assertEqual(resposta.status_code, 403, resposta.content)
                        self.assertIn("Somente administradores", resposta.json()["detail"])
        self.assertEqual(Tutor.objects.count(), 1)
        self.assertEqual(Pet.objects.count(), 1)
        self.assertEqual(Agendamento.objects.count(), 1)

    def test_sem_autenticacao_nao_pode_ler_ou_escrever_em_nenhum_modulo(self):
        for modulo, registro in self.modulos.items():
            for metodo in ("get", "head", "options", "post", "put", "patch", "delete"):
                url = f"/api/{modulo}/" if metodo in ("get", "head", "options", "post") else f"/api/{modulo}/{registro.pk}/"
                with self.subTest(metodo=metodo, url=url):
                    resposta = getattr(self.client, metodo)(url, {}, content_type="application/json")
                    self.assertEqual(resposta.status_code, 403)

    def test_superusuario_pode_cadastrar_editar_e_excluir_nos_tres_modulos(self):
        self.client.force_login(self.admin)
        dados_tutor = {
            "nome": "Novo tutor", "cpf": cpf_de_teste("000000002"), "senha": "Tutor@2026",
            "telefone": "11999990000", "email": "novo@example.com", "endereco": "Rua B",
        }
        tutor = self.client.post("/api/tutores/", dados_tutor, content_type="application/json")
        self.assertEqual(tutor.status_code, 201, tutor.content)
        tutor_id = tutor.json()["id"]
        dados_pet = {"tutor": tutor_id, "nome": "Nina", "especie": "Gato"}
        pet = self.client.post("/api/pets/", dados_pet, content_type="application/json")
        self.assertEqual(pet.status_code, 201, pet.content)
        pet_id = pet.json()["id"]
        dados_agendamento = {
            "tutor": tutor_id, "pet": pet_id,
            "data_agendamento": (timezone.now() + timedelta(days=2)).isoformat(), "motivo": "Rotina",
        }
        agendamento = self.client.post("/api/agendamentos/", dados_agendamento, content_type="application/json")
        self.assertEqual(agendamento.status_code, 201, agendamento.content)
        registros = [
            ("tutores", tutor_id, dados_tutor, {"nome": "Tutor atualizado"}),
            ("pets", pet_id, dados_pet, {"nome": "Nina atualizada"}),
            ("agendamentos", agendamento.json()["id"], dados_agendamento, {"motivo": "Retorno"}),
        ]
        for modulo, registro_id, dados, alteracao in registros:
            url = f"/api/{modulo}/{registro_id}/"
            with self.subTest(modulo=modulo):
                self.assertEqual(self.client.put(url, dados, content_type="application/json").status_code, 200)
                resposta = self.client.patch(url, alteracao, content_type="application/json")
                self.assertEqual(resposta.status_code, 200, resposta.content)
                campo = next(iter(alteracao))
                self.assertEqual(self.client.get(url).json()[campo], alteracao[campo])
        for modulo, registro_id, _, _ in reversed(registros):
            with self.subTest(exclusao=modulo):
                self.assertEqual(self.client.delete(f"/api/{modulo}/{registro_id}/").status_code, 204)


@override_settings(CPF_ENCRYPTION_KEY="BO8mpA0QOe8JyAJPmnorrGsV5C9lJBLyD_vf-axTJeA=", CPF_LOOKUP_KEY="chave-de-teste")
class SincronizacaoCpfTests(TestCase):
    def test_sincroniza_indice_importado_sem_alterar_cifra(self):
        from django.core.management import call_command
        cpf = cpf_de_teste("000000001")
        cifra = criptografar_cpf(cpf)
        tutor = Tutor.objects.create(nome="Importado", cpf_encrypted=cifra, cpf_lookup_hash="antigo")
        call_command("sincronizar_cpfs", verbosity=0)
        call_command("sincronizar_cpfs", verbosity=0)
        tutor.refresh_from_db()
        self.assertEqual(tutor.cpf_encrypted, cifra)
        self.assertEqual(tutor.cpf_lookup_hash, hash_consulta_cpf(cpf))

    def test_cifra_invalida_nao_altera_nenhum_indice(self):
        from django.core.management import call_command, CommandError
        Tutor.objects.create(nome="A", cpf_encrypted=criptografar_cpf(cpf_de_teste("000000001")), cpf_lookup_hash="antigo-a")
        Tutor.objects.create(nome="B", cpf_encrypted="invalido", cpf_lookup_hash="antigo-b")
        with self.assertRaises(CommandError):
            call_command("sincronizar_cpfs", verbosity=0)
        self.assertEqual(set(Tutor.objects.values_list("cpf_lookup_hash", flat=True)), {"antigo-a", "antigo-b"})
