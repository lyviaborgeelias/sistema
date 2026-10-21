# 🐾 AgroPet - Sistema de Gestão Veterinária

O **AgroPet** é um sistema web desenvolvido para facilitar o gerenciamento de uma clínica veterinária, permitindo o cadastro e a organização de tutores, pets e agendamentos.

## Tecnologias utilizadas

- **Frontend:** React + Vite
- **Backend:** Python + Django
- **Banco de dados:** MySQL
- **Linguagens:** JavaScript, Python e SQL

## Funcionalidades

- Login e cadastro de usuários
- Cadastro e gerenciamento de tutores
- Cadastro de pets vinculados aos tutores
- Gerenciamento de agendamentos
- Consulta e pesquisa de registros
- Controle de permissões entre usuários e administradores

## Como executar o projeto

### 1. Pré-requisitos

É necessário ter instalado:

- Python 3.11 ou superior
- Node.js 20 ou superior
- MySQL Server
- Git

### 2. Clonar o repositório

```bash
git clone https://github.com/lyviaborgeelias/sistema.git
cd sistema
```

### 3. Configurar o banco de dados

Abra o MySQL Workbench e execute o arquivo:

`backend/saep_db.sql`

O script criará o banco `saep_bd` com dados de exemplo.

Configure o usuário e a senha do MySQL no arquivo `backend/core/settings.py`.

### 4. Executar o backend

No terminal:

```bash
cd backend
python -m venv env
.\env\Scripts\activate
pip install -r requirements.txt
```

Copie o arquivo `.env.example` para `.env` e mantenha as configurações de desenvolvimento.

Em seguida, execute:

```bash
Copy-Item .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

O backend estará disponível em:

`http://127.0.0.1:8000`

### 5. Executar o frontend

Abra outro terminal e execute:

```bash
cd frontend
npm install
```

Copie o arquivo `.env.example` para `.env` e execute:

```bash
npm run dev
```

O frontend estará disponível em:

`http://127.0.0.1:5173`

## Acesso ao sistema

Utilize o usuário e a senha criados com o comando `createsuperuser` para acessar as funcionalidades administrativas.

Usuários comuns possuem acesso às funcionalidades de consulta e visualização.

## Observações

- O MySQL deve estar em execução.
- O frontend e o backend precisam estar rodando simultaneamente.
- O script SQL deve ser executado somente na configuração inicial, pois recria o banco de dados.

## Repositório

[GitHub - AgroPet](https://github.com/lyviaborgeelias/sistema)