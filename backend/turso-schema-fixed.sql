-- CreateTable
DROP TABLE IF EXISTS "usuarios_master";
CREATE TABLE "usuarios_master" (
    "id_master" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome_completo" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "data_nascimento" DATETIME NOT NULL,
    "status_kyc" TEXT DEFAULT 'Pendente',
    "wallet_saldo" REAL DEFAULT 0,
    "saldo_reais" DECIMAL DEFAULT 0,
    "data_cadastro" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
DROP TABLE IF EXISTS "usuarios_dependentes";
CREATE TABLE "usuarios_dependentes" (
    "id_dependente" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_master_fk" INTEGER NOT NULL,
    "nickname" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "data_nascimento" DATETIME NOT NULL,
    "moedas_virtuais" INTEGER DEFAULT 0,
    "data_cadastro" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usuarios_dependentes_id_master_fk_fkey" FOREIGN KEY ("id_master_fk") REFERENCES "usuarios_master" ("id_master") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
DROP TABLE IF EXISTS "figurinhas_catalogo";
CREATE TABLE "figurinhas_catalogo" (
    "id_figurinha" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero_album" INTEGER NOT NULL,
    "nome_jogador" TEXT NOT NULL,
    "fase_grupo" INTEGER NOT NULL,
    "raridade" TEXT DEFAULT 'Comum',
    "imagem" TEXT
);

-- CreateTable
DROP TABLE IF EXISTS "usuarios_figurinhas";
CREATE TABLE "usuarios_figurinhas" (
    "id_registro" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_dependente_fk" INTEGER NOT NULL,
    "id_figurinha_fk" INTEGER NOT NULL,
    "quantidade" INTEGER DEFAULT 1,
    "colada" BOOLEAN DEFAULT false,
    CONSTRAINT "usuarios_figurinhas_id_dependente_fk_fkey" FOREIGN KEY ("id_dependente_fk") REFERENCES "usuarios_dependentes" ("id_dependente") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "usuarios_figurinhas_id_figurinha_fk_fkey" FOREIGN KEY ("id_figurinha_fk") REFERENCES "figurinhas_catalogo" ("id_figurinha") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
DROP TABLE IF EXISTS "controle_fases_pais";
CREATE TABLE "controle_fases_pais" (
    "id_controle" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_master_fk" INTEGER NOT NULL,
    "id_dependente_fk" INTEGER NOT NULL,
    "fase_atual_liberada" INTEGER DEFAULT 1,
    "exigir_aprovacao_pai" BOOLEAN DEFAULT true,
    CONSTRAINT "controle_fases_pais_id_master_fk_fkey" FOREIGN KEY ("id_master_fk") REFERENCES "usuarios_master" ("id_master") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "controle_fases_pais_id_dependente_fk_fkey" FOREIGN KEY ("id_dependente_fk") REFERENCES "usuarios_dependentes" ("id_dependente") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
DROP TABLE IF EXISTS "salas_chat";
CREATE TABLE "salas_chat" (
    "id_sala" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_crianca_1" INTEGER NOT NULL,
    "id_crianca_2" INTEGER NOT NULL,
    "id_pai_1" INTEGER NOT NULL,
    "id_pai_2" INTEGER NOT NULL,
    "status_sala" TEXT DEFAULT 'Ativa',
    "data_criacao" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "salas_chat_id_crianca_1_fkey" FOREIGN KEY ("id_crianca_1") REFERENCES "usuarios_dependentes" ("id_dependente") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "salas_chat_id_crianca_2_fkey" FOREIGN KEY ("id_crianca_2") REFERENCES "usuarios_dependentes" ("id_dependente") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "salas_chat_id_pai_1_fkey" FOREIGN KEY ("id_pai_1") REFERENCES "usuarios_master" ("id_master") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "salas_chat_id_pai_2_fkey" FOREIGN KEY ("id_pai_2") REFERENCES "usuarios_master" ("id_master") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
DROP TABLE IF EXISTS "mensagens_chat";
CREATE TABLE "mensagens_chat" (
    "id_mensagem" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_sala_fk" INTEGER NOT NULL,
    "id_enviou_fk" INTEGER NOT NULL,
    "conteudo_mensagem" TEXT NOT NULL,
    "status_moderacao" TEXT DEFAULT 'Aprovada',
    "motivo_bloqueio" TEXT,
    "data_envio" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mensagens_chat_id_sala_fk_fkey" FOREIGN KEY ("id_sala_fk") REFERENCES "salas_chat" ("id_sala") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mensagens_chat_id_enviou_fk_fkey" FOREIGN KEY ("id_enviou_fk") REFERENCES "usuarios_dependentes" ("id_dependente") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
DROP TABLE IF EXISTS "autorizacoes_troca";
CREATE TABLE "autorizacoes_troca" (
    "id_troca" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_sala_fk" INTEGER,
    "id_figurinha_ofertada" INTEGER NOT NULL,
    "id_figurinha_solicitada" INTEGER NOT NULL,
    "id_crianca_propos" INTEGER NOT NULL,
    "id_crianca_aceitou" INTEGER,
    "pai_1_aprovou" BOOLEAN DEFAULT false,
    "pai_2_aprovou" BOOLEAN DEFAULT false,
    "status_troca" TEXT DEFAULT 'Aberta',
    "data_proposta" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "autorizacoes_troca_id_sala_fk_fkey" FOREIGN KEY ("id_sala_fk") REFERENCES "salas_chat" ("id_sala") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "autorizacoes_troca_id_figurinha_ofertada_fkey" FOREIGN KEY ("id_figurinha_ofertada") REFERENCES "figurinhas_catalogo" ("id_figurinha") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "autorizacoes_troca_id_figurinha_solicitada_fkey" FOREIGN KEY ("id_figurinha_solicitada") REFERENCES "figurinhas_catalogo" ("id_figurinha") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "autorizacoes_troca_id_crianca_propos_fkey" FOREIGN KEY ("id_crianca_propos") REFERENCES "usuarios_dependentes" ("id_dependente") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "autorizacoes_troca_id_crianca_aceitou_fkey" FOREIGN KEY ("id_crianca_aceitou") REFERENCES "usuarios_dependentes" ("id_dependente") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
DROP TABLE IF EXISTS "apostas_arena";
CREATE TABLE "apostas_arena" (
    "id_aposta" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_master_fk" INTEGER NOT NULL,
    "evento_descricao" TEXT NOT NULL,
    "tipo_aposta" TEXT NOT NULL,
    "valor_apostado" REAL NOT NULL,
    "cota_odd" REAL NOT NULL,
    "status_aposta" TEXT DEFAULT 'Aberta',
    "premio_potencial" REAL NOT NULL,
    "data_aposta" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "apostas_arena_id_master_fk_fkey" FOREIGN KEY ("id_master_fk") REFERENCES "usuarios_master" ("id_master") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
DROP TABLE IF EXISTS "historico_carteira";
CREATE TABLE "historico_carteira" (
    "id_transacao" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_master_fk" INTEGER NOT NULL,
    "tipo_transacao" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "status_transacao" TEXT DEFAULT 'Concluido',
    "data_transacao" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "historico_carteira_id_master_fk_fkey" FOREIGN KEY ("id_master_fk") REFERENCES "usuarios_master" ("id_master") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
DROP INDEX IF EXISTS "usuarios_master_cpf_key";
CREATE UNIQUE INDEX "usuarios_master_cpf_key" ON "usuarios_master"("cpf");

