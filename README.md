# VetCare - Como instalar e executar

Sistema de gestão veterinária com tutores, pets e agendamentos. O backend usa Python e Django, o frontend usa React e Vite, e os dados ficam no MySQL.

Este guia usa **Windows com PowerShell**. Os comandos indicam a pasta em que devem ser executados. Para usar o sistema, mantenha **dois terminais abertos**: um para o backend e outro para o frontend.

## 1. O que precisa estar instalado

| Programa | Versão / finalidade |
|---|---|
| Python | 3.11.5 ou superior. No Python 3.11, o pip seleciona Django 5.2 dentro das versões permitidas pelo projeto. |
| Node.js e npm | Node.js 20 ou superior; npm acompanha a instalação do Node.js. |
| MySQL Server | MySQL 8 ou superior, com o serviço em execução. |
| MySQL Workbench | Opcional, mas facilita executar o script do banco. Não substitui o MySQL Server. |
| Navegador | Para abrir a interface do sistema. |

Confira no PowerShell:

```powershell
python --version
node --version
npm --version
```

Se `python` não for reconhecido, tente `py --version`. Reabra o terminal depois de instalar os programas. Se necessário, habilite a opção de adicionar Python ao PATH na instalação.

A instalação das bibliotecas com pip e npm normalmente exige internet. Para apresentar o projeto sem internet, instale e teste as dependências previamente no computador de destino.

## 2. Localize a pasta correta

Extraia o ZIP antes de executar. Abra a pasta `sistema`, que contém este README e as pastas `backend` e `frontend`.

Exemplo de caminho; adapte se você extraiu em outro local:

```powershell
cd "C:\Users\SEU_USUARIO\Documents\sistema"
dir
```

Estrutura principal:

```text
sistema/
├── README.md
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── saep_db.sql
│   ├── core/settings.py
│   └── backend/
└── frontend/
    ├── package.json
    ├── package-lock.json
    ├── .env.example
    └── src/
```

## 3. Prepare o MySQL

### Opção A - Começar com os dados de demonstração

**Atenção: `saep_db.sql` apaga e recria o banco `saep_bd`. Execute apenas na primeira instalação ou quando quiser conscientemente reiniciar todos os dados. Não o execute toda vez que abrir o sistema.**

1. Inicie o serviço do MySQL Server.
2. Abra o MySQL Workbench e conecte-se ao servidor local.
3. Use **File > Open SQL Script** para abrir `backend/saep_db.sql`.
4. Execute o arquivo completo, sem selecionar apenas parte dele.
5. Atualize a lista de schemas e confira o banco `saep_bd`.

O script cria três tutores, três pets, três agendamentos e a view `vw_agendamentos`. As contas de login serão criadas depois, pelo Django.

### Opção B - Começar com o banco vazio

Se não quiser dados de exemplo, execute somente:

```sql
CREATE DATABASE saep_bd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Escolha apenas uma das opções. Em ambos os casos, continue com os passos seguintes.

### Confira a conexão usada pelo projeto

Abra `backend/core/settings.py` e ajuste o bloco `DATABASES` para o seu MySQL:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'saep_bd',
        'USER': 'root',
        'PASSWORD': 'root',
        'HOST': 'localhost',
        'PORT': '3306',
    }
}
```

`USER` e `PASSWORD` são as credenciais do **MySQL**, não as do administrador do VetCare. Se sua senha MySQL não for `root`, substitua o valor por sua senha real.

**Nesta versão, a conexão MySQL é definida em `core/settings.py`. Variáveis `DB_USER` ou `DB_PASSWORD` no `.env` não são lidas pelo projeto.**

## 4. Configure o backend - primeiro terminal

### Entre na pasta e crie o ambiente virtual

A partir da pasta `sistema`:

```powershell
cd backend
python -m venv env
.\env\Scripts\Activate.ps1
```

Se o comando disponível no computador for `py`, use `py -3.11 -m venv env` para selecionar o Python 3.11 instalado. Depois da ativação, use `python` nos comandos seguintes.

O início da linha normalmente mostrará `(env)`. Confira:

```powershell
python --version
python -c "import sys; print(sys.executable)"
```

O executável deve estar dentro de `backend\env\Scripts`. Ao copiar o projeto para outro computador, crie um novo ambiente virtual; não reutilize a pasta `env` de outra instalação.

### Instale as dependências

Ainda em `backend`, com o ambiente ativado:

```powershell
python -m pip install -r requirements.txt
```

### Crie a configuração local

Execute apenas se ainda não houver um `.env` configurado:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

O arquivo `.env` deve ficar **ao lado de `manage.py`**. Não renomeie para `.env.txt`.

| Configuração | Para que serve |
|---|---|
| `SECRET_KEY` | Assinatura de dados e sessões do Django. Não pode ficar vazia. |
| `DEBUG=True` | Modo de desenvolvimento local. |
| `ALLOWED_HOSTS` | Hosts aceitos pelo backend. |
| `CORS_ALLOWED_ORIGINS` | Endereços do frontend autorizados a acessar a API. |
| `CPF_ENCRYPTION_KEY` | Chave para cifrar e decifrar os CPFs. |
| `CPF_LOOKUP_KEY` | Chave do índice usado para detectar CPFs duplicados. |

O exemplo já está preparado para execução local e leitura dos CPFs fictícios do SQL. **Preserve as chaves de uma instalação que já possui dados.** Trocar a chave de criptografia impede a leitura dos CPFs anteriores. As chaves públicas de demonstração não devem ser usadas em produção.

### Execute as migrations

```powershell
python manage.py migrate
```

Esse comando:

- Cria as tabelas internas de autenticação, permissões e sessões.
- Reconhece as tabelas iniciais já criadas pelo script SQL.
- Cria as tabelas da clínica se o banco estiver vazio.
- Sincroniza os índices de CPF com a chave configurada, inclusive depois de uma nova importação do SQL.

As migrations já estão no projeto; **não é necessário executar `makemigrations` na instalação**. A sincronização pode informar `Índices de CPF sincronizados: 0.` quando os índices já estão corretos ou não há tutores.

Se houver erro de chave ou CPF duplicado, resolva a mensagem antes de continuar. Para executar apenas a sincronização:

```powershell
python manage.py sincronizar_cpfs
```

### Crie seu administrador

```powershell
python manage.py createsuperuser
```

Informe o nome de usuário, o e-mail solicitado e uma senha. A senha não aparece enquanto você digita no terminal; isso é normal.

Guarde o **nome de usuário** e a senha escolhidos. São esses dados que você usará no login do sistema. Não existe uma conta administrativa padrão incluída no SQL.

### Inicie o backend

```powershell
python manage.py runserver
```

Deixe esse terminal aberto. O backend estará em:

- API: <http://127.0.0.1:8000/api/>
- Verificação do servidor: <http://127.0.0.1:8000/>
- Django Admin: <http://127.0.0.1:8000/admin/>

A página inicial do backend retorna JSON; ela não é a interface React. Uma rota protegida pode responder 401 ou 403 sem autenticação, mesmo com o servidor funcionando.

## 5. Configure o frontend - segundo terminal

Abra outro PowerShell. Entre na pasta `frontend` usando o caminho em que você extraiu o projeto:

```powershell
cd "C:\Users\SEU_USUARIO\Documents\sistema\frontend"
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm ci
npm run dev
```

`npm ci` instala as versões registradas no `package-lock.json`. Os ícones e as demais bibliotecas são instalados junto; não é necessário instalá-los separadamente.

O arquivo `frontend/.env` deve conter:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Abra **<http://127.0.0.1:5173>** no navegador. Mantenha o terminal do frontend aberto também.

Use `127.0.0.1` tanto no endereço do frontend quanto na API, conforme o exemplo. Evite misturar `localhost` e `127.0.0.1` na mesma execução, pois o navegador trata os cookies desses hosts separadamente.

## 6. Entre e use o sistema

Faça login com o usuário criado por `createsuperuser`.

| Tipo de conta | Permissões |
|---|---|
| Administrador criado pelo terminal | Consultar, adicionar, editar e excluir tutores, pets e agendamentos. |
| Conta criada pela tela **Criar conta** | Somente visualizar, pesquisar e abrir detalhes. |

O cadastro pela interface não concede privilégios administrativos. As restrições também são aplicadas na API.

A ordem para cadastrar dados é **tutor > pet vinculado ao tutor > agendamento do pet**. Tutores e pets com registros vinculados não podem ser excluídos enquanto esses vínculos existirem. A sessão expira após 30 minutos sem requisições.

A senha armazenada no cadastro de um tutor é um dado desse registro; ela não cria uma conta de acesso ao painel. Use sempre uma conta do sistema para entrar.

## 7. Como abrir o projeto nos próximos dias

Não reimporte o SQL, não copie o `.env` novamente e não recrie o administrador.

**Terminal 1 - backend:**

```powershell
cd "C:\Users\SEU_USUARIO\Documents\sistema\backend"
.\env\Scripts\Activate.ps1
python manage.py runserver
```

**Terminal 2 - frontend:**

```powershell
cd "C:\Users\SEU_USUARIO\Documents\sistema\frontend"
npm run dev
```

Verifique se o MySQL está ativo e abra <http://127.0.0.1:5173>. Para parar os servidores, pressione **Ctrl+C** em cada terminal.

Se receber uma versão atualizada do projeto com novas migrations, execute `python manage.py migrate` antes de iniciar o backend.

## 8. Solução dos problemas mais comuns

### PowerShell bloqueia a ativação do ambiente virtual

É possível usar diretamente o Python do ambiente, sem mudar a política do PowerShell:

```powershell
.\env\Scripts\python.exe -m pip install -r requirements.txt
.\env\Scripts\python.exe manage.py migrate
.\env\Scripts\python.exe manage.py runserver
```

Use esse mesmo prefixo para os outros comandos Python. Se o PowerShell bloquear `npm.ps1`, execute `npm.cmd ci` e `npm.cmd run dev`.

### Erro de conexão ou acesso negado no MySQL

Confira o serviço MySQL e os campos `USER`, `PASSWORD`, `HOST` e `PORT` em `backend/core/settings.py`. Se aparecer `Unknown database 'saep_bd'`, volte ao passo 3 para criar o banco.

### Erro 500 ou `The SECRET_KEY setting must not be empty`

Confirme que `backend/.env` existe, está ao lado de `manage.py` e contém `SECRET_KEY`. Confira a exceção no terminal do backend. Depois de alterar `.env`, pare e reinicie o servidor; não basta atualizar o navegador.

### CORS, CSRF ou `Failed to load resource`

Primeiro verifique se o backend está rodando e se há uma exceção no terminal. No `backend/.env`, confira:

```env
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

Confira também `VITE_API_URL` no frontend. Reinicie ambos os servidores após alterar os arquivos `.env` e atualize a página com **Ctrl+F5**. Não desative a proteção CSRF.

### O frontend abriu na porta 5174

A porta 5173 pode estar ocupada por outra execução. Encerre a execução anterior e inicie novamente. Caso escolha outra porta, inclua a origem completa correspondente em `CORS_ALLOWED_ORIGINS` e reinicie o backend.

### `Table 'tutores_tutor' already exists`

Confirme que está executando `manage.py` desta versão, dentro da pasta `backend`. O comando `python manage.py migrate` do projeto reconhece as tabelas iniciais importadas. Não apague o banco nem use `--fake` indiscriminadamente para contornar o erro.

### Erro de CPF ao cadastrar ou migrar

Confira `CPF_ENCRYPTION_KEY` e `CPF_LOOKUP_KEY` no `.env`. Para os dados fictícios importados, a chave de criptografia deve ser a do `.env.example`. Preserve as chaves de dados próprios já cadastrados. Depois de corrigir a configuração, execute `python manage.py sincronizar_cpfs`.

### Usuário ou senha inválidos

Entre com o **nome de usuário**, não com o e-mail ou o nome do tutor. Para redefinir a senha de uma conta existente, no backend:

```powershell
python manage.py changepassword SEU_USUARIO
```

Se a conta não existe, crie-a com `createsuperuser` para acesso administrativo ou pela tela de cadastro para consulta.

### Não aparecem botões de adicionar, editar e excluir

Confira se você entrou com o administrador criado por `createsuperuser`. Para contas comuns, ocultar esses botões é o comportamento esperado.

## 9. Verificações e testes opcionais

No terminal do backend com o ambiente ativado e o `.env` configurado:

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
```

Para executar a suíte em um banco SQLite isolado, sem usar o MySQL da aplicação:

```powershell
$env:TEST_SQLITE = "1"
try {
    python manage.py test backend
    python test_migrate.py
} finally {
    Remove-Item Env:TEST_SQLITE -ErrorAction SilentlyContinue
}
```

Não inicie o servidor com `TEST_SQLITE=1`; essa opção é exclusiva dos testes. O bloco acima remove a variável ao terminar.

Com o backend local rodando em `127.0.0.1:8000` e o MySQL configurado, também é possível executar:

```powershell
python tools/check_http_endpoints.py
```

Esse teste HTTP cria contas e registros temporários, verifica as rotas e remove os registros que criou ao final. Execute apenas no ambiente local de demonstração. O relatório é salvo em `http-endpoints-report.json` na raiz do projeto.

Para validar a compilação do frontend, dentro de `frontend`:

```powershell
npm run build
```

## 10. Entrega e configuração em outro computador

O pacote SAEP contém `documentacao.pdf`, `der.pdf`, `saep_db.sql` e a pasta `sistema`. Os arquivos `.env.example` acompanham o código; os `.env` pessoais, `env` e `node_modules` não acompanham a entrega.

Em outro computador, extraia o pacote e siga este guia desde o início. O SQL da raiz do pacote é uma cópia do SQL em `sistema/backend`; execute apenas uma dessas cópias.

Este guia é para desenvolvimento e avaliação local. Para produção, use configuração própria de segredos, HTTPS, `DEBUG=False` e servidor adequado; não publique as chaves de demonstração nem use `runserver` como servidor de produção.
