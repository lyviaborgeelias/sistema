# VetCare — Gestão Veterinária SAEP 2026

Sistema de gerenciamento de tutores, pets e agendamentos. O app Django fica em `backend/backend/`, com a configuração do projeto em `backend/core/` e o `manage.py` na raiz de `backend/`. O frontend usa React, Vite, React Router, Axios, Lucide React para ícones e CSS comum. O banco principal é MySQL.

## Pré-requisitos

- Python 3.12+, Node.js 20+ e MySQL 8+.
- Banco com InnoDB e `utf8mb4`.
- PowerShell no Windows ou terminal equivalente.

## Banco MySQL

Instale o MySQL Community Server 8, inicie o serviço e configure uma conta com permissão para criar bancos e tabelas. Abra [saep_db.sql](backend/saep_db.sql) no MySQL Workbench e execute o arquivo inteiro. Ele apaga e recria `saep_bd`, cria as tabelas `tutores_tutor`, `pets_pet` e `agendamentos_agendamento`, insere três registros em cada uma e cria a view `vw_agendamentos`.

Depois da importação, execute `python manage.py migrate --fake-initial`. O Django reconhece as três tabelas já criadas e cria suas tabelas internas de autenticação, sessão e permissões. O SQL contém apenas as tabelas e os dados da clínica; as contas de acesso são criadas depois pelo sistema ou pelo comando `createsuperuser`.

Se quiser iniciar sem dados de exemplo, crie somente um banco vazio e deixe o Django criar as tabelas com `migrate`:

```sql
CREATE DATABASE saep_bd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Backend

A partir da pasta `sistema/`, onde fica este README:

```powershell
cd backend
py -m venv env
.\env\Scripts\Activate.ps1
Copy-Item .env.example .env
python -m pip install -r requirements.txt
```

Se a pasta `env/` já existe, apenas ative-a; não precisa recriá-la. Essa pasta é o ambiente virtual do Python. Confira a conexão MySQL em `backend/core/settings.py`. O arquivo `backend/.env` guarda as chaves do Django e da criptografia de CPF. O exemplo contém chaves exclusivas para avaliação local. Depois de importar o SQL:

```powershell
python manage.py makemigrations
python manage.py migrate --fake-initial
python manage.py createsuperuser
python manage.py runserver
```

Como a migration inicial já está no projeto, `makemigrations` deve responder `No changes detected`. Se você criou apenas um banco vazio, use `python manage.py migrate` no lugar de `migrate --fake-initial`; nesse caso, as tabelas começam sem os dados de exemplo. O backend fica em `http://127.0.0.1:8000/`, e o painel administrativo em `http://127.0.0.1:8000/admin/`. O superusuário criado também pode entrar no frontend. Os CPFs do SQL usam as chaves de `backend/.env.example`.

Em produção, configure segredos próprios para `SECRET_KEY`, `CPF_ENCRYPTION_KEY` e `CPF_LOOKUP_KEY`, `DEBUG=False`, HTTPS, hosts e origens permitidas e cookies Secure. Gere segredos com `python -c "import secrets; print(secrets.token_urlsafe(48))"` e uma chave Fernet com `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.

## Frontend

Em outro terminal, a partir da pasta `sistema/`:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Abra `http://127.0.0.1:5173`. O frontend envia o cookie de sessão para o backend indicado em `VITE_API_URL`. Antes de cada POST, PUT, PATCH ou DELETE, o Axios busca um token CSRF atualizado em `/api/auth/csrf/` e o envia no cabeçalho da requisição, inclusive depois do login.

As telas estão separadas em `src/pages/`, cada uma com `index.jsx` e `styles.css`. A interface usa tons de marrom e mantém o layout responsivo. A organização é:

```text
frontend/
├── public/
└── src/
    ├── api/index.js
    ├── pages/
    │   ├── Login/
    │   ├── Cadastro/
    │   ├── Dashboard/
    │   ├── Tutores/
    │   ├── TutorForm/
    │   ├── Pets/
    │   ├── PetForm/
    │   ├── Agendamentos/
    │   ├── AgendamentoForm/
    │   └── AgendamentoDetalhe/
    ├── utils/
    ├── App.jsx
    ├── App.css
    ├── main.jsx
    └── styles.css
```

`App.jsx` reúne as rotas, o menu e o controle da sessão. `App.css` guarda o estilo da estrutura compartilhada, e `styles.css` define as cores e os estilos básicos. Os estilos específicos ficam dentro da pasta de cada tela.

Os ícones são importados diretamente de `lucide-react` nas telas. A dependência é instalada junto das demais com `npm install`.

## Cadastro e permissões

Na tela de login, clique em **Criar conta** para abrir `/cadastro`. Informe nome, usuário, e-mail, senha e confirmação. Após salvar, entre com os dados cadastrados. Se o usuário já existir, o formulário mostra **Este usuário já está cadastrado.**, inclusive quando apenas as letras maiúsculas e minúsculas forem diferentes.

| Conta | Permissões |
|---|---|
| Criada pela tela de cadastro | Consultar dashboard, tutores, pets e agendamentos, pesquisar e abrir detalhes. |
| Superusuário criado com `python manage.py createsuperuser` | Consultar, cadastrar, editar e excluir registros e acessar o Django Admin. |

O cadastro público nunca concede `is_staff` ou `is_superuser`. O backend exige superusuário para qualquer alteração nos módulos, mesmo em chamadas diretas à API. A interface esconde as ações de gestão e bloqueia as URLs dos formulários para contas de consulta. O perfil aparece no cabeçalho e é recuperado da sessão no backend.

O endpoint de cadastro é `POST /api/auth/register/`, com proteção CSRF e os campos `nome`, `username`, `email`, `password` e `password_confirm`. As senhas são validadas e armazenadas com hash do Django. O cadastro não inicia uma sessão automaticamente.

## Dados iniciais

O arquivo [saep_db.sql](backend/saep_db.sql) cria e popula as tabelas da clínica com três tutores, três pets e três agendamentos. A importação apaga os dados anteriores de `saep_bd`; faça-a antes de cadastrar suas contas de acesso. Depois de executar `migrate --fake-initial`, use `python manage.py createsuperuser` para escolher o usuário e a senha da conta administrativa. Os usuários comuns podem usar **Criar conta** no frontend e terão acesso somente para visualização.

A senha dos tutores fictícios é `1234`, armazenada como hash. Essa credencial de tutor não dá acesso ao painel. Para entrar e gerenciar os dados, use o superusuário criado por você. Os CPFs do SQL estão criptografados com as chaves de demonstração de `.env.example`; mantenha essas chaves na configuração local para ler os registros importados.

Para criar, popular e iniciar, siga esta ordem:

1. Execute `saep_db.sql` no MySQL Workbench.
2. No backend, execute `python manage.py migrate --fake-initial`.
3. Crie sua conta administrativa com `python manage.py createsuperuser`.
4. Inicie o backend com `python manage.py runserver`.

## Testes

O banco final é MySQL. Para executar os testes isolados com SQLite somente na suíte, no terminal do backend:

```powershell
$env:TEST_SQLITE = "1"
$env:SECRET_KEY = "chave-local-de-testes"
$env:CPF_ENCRYPTION_KEY = "BO8mpA0QOe8JyAJPmnorrGsV5C9lJBLyD_vf-axTJeA="
$env:CPF_LOOKUP_KEY = "chave-local-de-testes"
$env:DEBUG = "True"
python manage.py test
python manage.py makemigrations --check --dry-run
```

A suíte cobre cadastro de usuário, duplicidade, privilégios, sessão, CSRF, CRUD, proteção de CPF e senha, vínculos e agendamentos. Para verificar o frontend, execute `npm run build` em `frontend/`.

## Documentação e estrutura

- [Documentação técnica](docs/documentacao.md) e [PDF](docs/documentacao.pdf).
- [DER](docs/der.png) e [fonte Mermaid](docs/der.mmd).
- [Checklist de critérios](docs/CHECKLIST_SAEP.md).
- `backend/backend/`: único app Django, com modelos, serializers, views, URLs, testes e migrations. O identificador interno `sistema` foi mantido para preservar o histórico das migrations.
- `backend/core/`: configurações, URLs principais, ASGI e WSGI. `manage.py`, `.env.example` e `requirements.txt` ficam diretamente em `backend/`; a pasta `env/` é local e não entra na entrega.
- `frontend/`: telas React em `src/pages/NomeDaTela/index.jsx`, com seu próprio `styles.css`, e integração HTTP em `src/api/index.js`.
- `backend/saep_db.sql`: criação do banco, das três tabelas da clínica, dos dados de demonstração e da view.

Para regenerar o PDF e o DER, a partir da raiz:

```powershell
cd sistema
pip install -r docs/requirements.txt
python docs/gerar_der.py
python docs/gerar_documentacao.py
```

## Problemas comuns

- **Erro 1050: `Table 'tutores_tutor' already exists` ao executar `migrate`:** as tabelas já foram criadas pelo SQL. No terminal do backend, execute `python manage.py migrate --fake-initial` uma vez e depois `python manage.py runserver`. Esse comando registra a migration inicial e mantém os registros existentes. Nas próximas atualizações, use `python manage.py migrate` normalmente.
- **Falha de conexão MySQL:** confirme que o serviço está ativo e que `DB_HOST`, `DB_PORT`, `DB_USER` e `DB_PASSWORD` estão corretos no `.env` do backend.
- **Erro de CPF após importar SQL:** use as chaves locais de `.env.example`; trocar a chave de criptografia depois da importação impede a leitura dos CPFs já cifrados.
- **Falha CSRF no navegador:** use o endereço configurado em `CORS_ALLOWED_ORIGINS` e `VITE_API_URL`; mantenha frontend e backend nas origens previstas.
- **Mensagem `CSRF token from the 'X-Csrftoken' HTTP header incorrect` após login:** atualize a página para carregar a versão corrigida do frontend e entre novamente. A renovação do token ocorre automaticamente nas requisições de escrita; a proteção CSRF deve continuar habilitada.
