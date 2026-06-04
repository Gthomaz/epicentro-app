-- Criando a tabela dos Adultos (Responsáveis)
CREATE TABLE usuarios_master (
    id_master SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    data_nascimento DATE NOT NULL,
    status_kyc VARCHAR(20) DEFAULT 'Pendente',
    wallet_saldo DECIMAL(10, 2) DEFAULT 0.00,
    saldo_reais DECIMAL(10,2) DEFAULT 0.00,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criando a tabela das Crianças (Dependentes) com vínculo obrigatório
CREATE TABLE usuarios_dependentes (
    id_dependente SERIAL PRIMARY KEY,
    id_master_fk INT NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    data_nascimento DATE NOT NULL,
    moedas_virtuais INT DEFAULT 0,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_master_fk) REFERENCES usuarios_master(id_master) ON DELETE CASCADE
);

-- 1. Catálogo geral de figurinhas do nosso app
CREATE TABLE figurinhas_catalogo (
    id_figurinha SERIAL PRIMARY KEY,
    numero_album INT NOT NULL,
    nome_jogador VARCHAR(100) NOT NULL,
    fase_grupo INT NOT NULL, -- Ex: 1 = Fase Américas, 2 = Fase Europa...
    raridade VARCHAR(20) DEFAULT 'Comum',
    imagem VARCHAR(255)
);

-- 2. O álbum virtual de cada criança (o que ela já possui)
CREATE TABLE usuarios_figurinhas (
    id_registro SERIAL PRIMARY KEY,
    id_dependente_fk INT NOT NULL,
    id_figurinha_fk INT NOT NULL,
    quantidade INT DEFAULT 1,
    colada BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_dependente_fk) REFERENCES usuarios_dependentes(id_dependente) ON DELETE CASCADE,
    FOREIGN KEY (id_figurinha_fk) REFERENCES figurinhas_catalogo(id_figurinha)
);

-- 3. Controle de travas de fase pelos pais
CREATE TABLE controle_fases_pais (
    id_controle SERIAL PRIMARY KEY,
    id_master_fk INT NOT NULL,
    id_dependente_fk INT NOT NULL,
    fase_atual_liberada INT DEFAULT 1,
    exigir_aprovacao_pai BOOLEAN DEFAULT TRUE, -- SEGURANÇA: Pai decide se aprova ida para próxima fase
    FOREIGN KEY (id_master_fk) REFERENCES usuarios_master(id_master) ON DELETE CASCADE,
    FOREIGN KEY (id_dependente_fk) REFERENCES usuarios_dependentes(id_dependente) ON DELETE CASCADE
);

-- 1. Criação das Salas de Chat entre os usuários (sempre vinculando os pais)
CREATE TABLE salas_chat (
    id_sala SERIAL PRIMARY KEY,
    id_crianca_1 INT NOT NULL,
    id_crianca_2 INT NOT NULL,
    id_pai_1 INT NOT NULL,
    id_pai_2 INT NOT NULL,
    status_sala VARCHAR(20) DEFAULT 'Ativa', -- 'Ativa' ou 'Bloqueada'
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_crianca_1) REFERENCES usuarios_dependentes(id_dependente),
    FOREIGN KEY (id_crianca_2) REFERENCES usuarios_dependentes(id_dependente),
    FOREIGN KEY (id_pai_1) REFERENCES usuarios_master(id_master),
    FOREIGN KEY (id_pai_2) REFERENCES usuarios_master(id_master)
);

-- 2. Histórico de Mensagens com Filtro de Moderação
CREATE TABLE mensagens_chat (
    id_mensagem SERIAL PRIMARY KEY,
    id_sala_fk INT NOT NULL,
    id_enviou_fk INT NOT NULL, -- ID da criança que enviou
    conteudo_mensagem TEXT NOT NULL,
    status_moderacao VARCHAR(20) DEFAULT 'Aprovada', -- 'Aprovada', 'Bloqueada_Por_IA'
    motivo_bloqueio VARCHAR(100) DEFAULT NULL, -- Ex: 'Tentativa de enviar telefone'
    data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_sala_fk) REFERENCES salas_chat(id_sala) ON DELETE CASCADE,
    FOREIGN KEY (id_enviou_fk) REFERENCES usuarios_dependentes(id_dependente)
);

-- 3. Controle Estrito de Autorização de Troca Física / Virtual pelos Pais
CREATE TABLE autorizacoes_troca (
    id_troca SERIAL PRIMARY KEY,
    id_sala_fk INT, -- Pode ser null se vier da Feira Global
    id_figurinha_ofertada INT NOT NULL,
    id_figurinha_solicitada INT NOT NULL,
    id_crianca_propos INT NOT NULL,
    id_crianca_aceitou INT,
    pai_1_aprovou BOOLEAN DEFAULT FALSE, -- Aprovação do pai da criança 1
    pai_2_aprovou BOOLEAN DEFAULT FALSE, -- Aprovação do pai da criança 2
    status_troca VARCHAR(20) DEFAULT 'Aberta', -- 'Aberta', 'Pendente_Aprovacao', 'Autorizada', 'Recusada'
    data_proposta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_sala_fk) REFERENCES salas_chat(id_sala) ON DELETE CASCADE,
    FOREIGN KEY (id_figurinha_ofertada) REFERENCES figurinhas_catalogo(id_figurinha),
    FOREIGN KEY (id_figurinha_solicitada) REFERENCES figurinhas_catalogo(id_figurinha),
    FOREIGN KEY (id_crianca_propos) REFERENCES usuarios_dependentes(id_dependente),
    FOREIGN KEY (id_crianca_aceitou) REFERENCES usuarios_dependentes(id_dependente)
);

-- 1. Tabela de Apostas dos Adultos
CREATE TABLE apostas_arena (
    id_aposta SERIAL PRIMARY KEY,
    id_master_fk INT NOT NULL, -- Apenas adultos apostam
    evento_descricao VARCHAR(255) NOT NULL, -- Ex: 'Brasil x Sérvia' ou 'BBB - Quem Sai'
    tipo_aposta VARCHAR(100) NOT NULL, -- Ex: 'Vitória Brasil' ou 'Eliminação Participante X'
    valor_apostado DECIMAL(10, 2) NOT NULL,
    cota_odd DECIMAL(5, 2) NOT NULL, -- A cotação do momento da aposta
    status_aposta VARCHAR(20) DEFAULT 'Aberta', -- 'Aberta', 'Ganha', 'Perdida'
    premio_potencial DECIMAL(10, 2) NOT NULL,
    data_aposta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_master_fk) REFERENCES usuarios_master(id_master) ON DELETE CASCADE
);

-- 2. Histórico Financeiro da Carteira (Extrato de Depósitos e Saques via PIX)
CREATE TABLE historico_carteira (
    id_transacao SERIAL PRIMARY KEY,
    id_master_fk INT NOT NULL,
    tipo_transacao VARCHAR(20) NOT NULL, -- 'Deposito_PIX', 'Saque_PIX', 'Premio_Aposta'
    valor DECIMAL(10, 2) NOT NULL,
    status_transacao VARCHAR(20) DEFAULT 'Concluido', -- 'Pendente', 'Concluido', 'Falhou'
    data_transacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_master_fk) REFERENCES usuarios_master(id_master) ON DELETE CASCADE
);
