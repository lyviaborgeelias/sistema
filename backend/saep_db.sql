-- VetCare SAEP 2026 - criacao do banco do zero no MySQL.
-- ATENCAO: este arquivo APAGA e recria o banco saep_bd.
-- Cria apenas as tabelas da clinica, com tres registros em cada.
-- Depois, no backend: python manage.py migrate --fake-initial
-- Para criar o administrador: python manage.py createsuperuser
-- Usuarios comuns sao cadastrados pela tela Criar conta.
-- CPFs criptografados com as chaves locais de demonstracao.

DROP DATABASE IF EXISTS saep_bd;
CREATE DATABASE saep_bd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE saep_bd;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE tutores_tutor (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    cpf_encrypted LONGTEXT NOT NULL,
    cpf_lookup_hash VARCHAR(64) NOT NULL UNIQUE,
    senha_hash VARCHAR(128) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(254) NOT NULL,
    endereco VARCHAR(255) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE pets_pet (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    especie VARCHAR(60) NOT NULL,
    raca VARCHAR(80) NOT NULL DEFAULT '',
    sexo VARCHAR(1) NOT NULL DEFAULT 'N',
    data_nascimento DATE NULL,
    observacoes LONGTEXT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    tutor_id BIGINT NOT NULL,
    CONSTRAINT fk_pet_tutor FOREIGN KEY (tutor_id)
        REFERENCES tutores_tutor (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE agendamentos_agendamento (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    data_agendamento DATETIME(6) NOT NULL,
    motivo VARCHAR(180) NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'pendente',
    observacoes LONGTEXT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    pet_id BIGINT NOT NULL,
    tutor_id BIGINT NOT NULL,
    CONSTRAINT fk_agendamento_pet FOREIGN KEY (pet_id)
        REFERENCES pets_pet (id) ON DELETE RESTRICT,
    CONSTRAINT fk_agendamento_tutor FOREIGN KEY (tutor_id)
        REFERENCES tutores_tutor (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Senha ficticia dos tutores: 1234, armazenada como hash.
SET @senha_tutor = 'pbkdf2_sha256$1200000$AgZfGQR5elqDPB8b9iCkkO$PL5WuN+7kEtCDcXQidOvpdr8Wq+YqO9QKdtA2W70fsE=';

INSERT INTO tutores_tutor (id, nome, cpf_encrypted, cpf_lookup_hash, senha_hash, telefone, email, endereco, created_at, updated_at) VALUES
(1, 'Ana Souza', 'gAAAAABq1gCG6VRUIUwe0UGt-2i07KBWkHjpknDieuDPTQPwJ2wXY8c_8QxDe9KapB1jKM9rOCjlxE0-Q2thv-dJFA2NjYyMXg==', '934df8f3d446c2fda97ef3525e4940b53a3a1c336fb12a18bd313fea999e7e2f', @senha_tutor, '(11) 99990-0001', 'ana@example.com', 'Rua das Flores, 100', '2026-10-19 12:00:00', '2026-10-19 12:00:00'),
(2, 'Bruno Lima', 'gAAAAABq1gCGe0KmLsCqCXx8058lHs13krMEnaqGg0JP_YsMZN6WxM6ZEkF8adBdNRrM7P2AN_qLSyzEKrtQfcs3NdUSPKB3qQ==', '769ebbd480e81e64bd101b58afa54d871ee6e000bc662db4d79db884306aabe0', @senha_tutor, '(11) 99990-0002', 'bruno@example.com', 'Av. Central, 250', '2026-10-19 12:00:00', '2026-10-19 12:00:00'),
(3, 'Carla Santos', 'gAAAAABq1gCG5RSUKqQN2PBe6GARF3UcFapSI9loCZi-Vyj6oEt-iTo4buLRvhicm9BLF7Eil5grWuYA36zuoXDx4iRypGKUFQ==', '35184257af20f18c8ae04be249c99d09de49ee41a76305585372a1cc6d9507a1', @senha_tutor, '(11) 99990-0003', 'carla@example.com', 'Rua do Sol, 30', '2026-10-19 12:00:00', '2026-10-19 12:00:00');

INSERT INTO pets_pet (id, nome, especie, raca, sexo, data_nascimento, observacoes, created_at, updated_at, tutor_id) VALUES
(1, 'Nina', 'Cachorro', 'Vira-lata', 'F', '2021-05-10', 'Registro fictício para demonstração.', '2026-10-19 12:00:00', '2026-10-19 12:00:00', 1),
(2, 'Mingau', 'Gato', 'SRD', 'M', '2022-03-15', 'Registro fictício para demonstração.', '2026-10-19 12:00:00', '2026-10-19 12:00:00', 2),
(3, 'Lola', 'Cachorro', 'Poodle', 'F', '2020-11-02', 'Registro fictício para demonstração.', '2026-10-19 12:00:00', '2026-10-19 12:00:00', 3);

INSERT INTO agendamentos_agendamento (id, data_agendamento, motivo, status, observacoes, created_at, updated_at, pet_id, tutor_id) VALUES
(1, '2026-10-20 13:00:00', 'Consulta de rotina', 'confirmado', 'Agendamento fictício para demonstração.', '2026-10-19 12:00:00', '2026-10-19 12:00:00', 1, 1),
(2, '2026-10-21 14:00:00', 'Vacinação anual', 'confirmado', 'Agendamento fictício para demonstração.', '2026-10-19 12:00:00', '2026-10-19 12:00:00', 2, 2),
(3, '2026-10-22 15:00:00', 'Retorno', 'pendente', 'Agendamento fictício para demonstração.', '2026-10-19 12:00:00', '2026-10-19 12:00:00', 3, 3);

CREATE OR REPLACE VIEW vw_agendamentos AS
SELECT
    a.id,
    a.data_agendamento,
    t.nome AS tutor,
    t.telefone,
    t.email,
    p.nome AS pet,
    p.especie,
    a.motivo,
    a.status
FROM agendamentos_agendamento a
INNER JOIN tutores_tutor t ON t.id = a.tutor_id
INNER JOIN pets_pet p ON p.id = a.pet_id;

-- Conferir os tres registros em cada tabela.
SELECT 'tutores' AS tabela, COUNT(*) AS total FROM tutores_tutor
UNION ALL SELECT 'pets', COUNT(*) FROM pets_pet
UNION ALL SELECT 'agendamentos', COUNT(*) FROM agendamentos_agendamento;

-- Agendamentos em ordem de data.
SELECT * FROM vw_agendamentos ORDER BY data_agendamento;
