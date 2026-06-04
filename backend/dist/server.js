"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const express_1 = __importDefault(require("express"));
const adapter_libsql_1 = require("@prisma/adapter-libsql");
const client_1 = require("@libsql/client");
const client_2 = require("@prisma/client");
const cors_1 = __importDefault(require("cors"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const dbAuthToken = process.env.DATABASE_AUTH_TOKEN; // Necessário para Turso em prod
const libsql = (0, client_1.createClient)({
    url: dbUrl,
    authToken: dbAuthToken
});
const adapter = new adapter_libsql_1.PrismaLibSql(libsql);
const prisma = new client_2.PrismaClient({ adapter });
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_album_key_123';
// Middleware de Autenticação
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "Token não fornecido" });
    }
    const [, token] = authHeader.split(" ");
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        return next();
    }
    catch (err) {
        return res.status(401).json({ error: "Token inválido" });
    }
};
exports.authMiddleware = authMiddleware;
// =========================================================================
// ROTA DE SEGURANÇA: CADASTRO VINCULADO (PAI + FILHO)
// =========================================================================
app.post('/api/cadastro/responsavel', async (req, res) => {
    const { nome_completo, cpf, senha_master, data_nascimento, nickname_filho, senha_filho, nascimento_filho } = req.body;
    if (!nome_completo || !cpf || !senha_master || !data_nascimento || !nickname_filho || !senha_filho || !nascimento_filho) {
        return res.status(400).json({ error: "Todos os campos obrigatórios precisam ser preenchidos!" });
    }
    try {
        const cpfExistente = await prisma.usuarios_master.findUnique({ where: { cpf: cpf } });
        if (cpfExistente) {
            return res.status(400).json({ error: "Este CPF já está cadastrado no sistema!" });
        }
        const nicknameExistente = await prisma.usuarios_dependentes.findFirst({ where: { nickname: nickname_filho } });
        if (nicknameExistente) {
            return res.status(400).json({ error: "Este Nickname já está em uso por outra criança!" });
        }
        const dataNascAdulto = new Date(data_nascimento);
        const hoje = new Date();
        let idade = hoje.getFullYear() - dataNascAdulto.getFullYear();
        const m = hoje.getMonth() - dataNascAdulto.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < dataNascAdulto.getDate())) {
            idade--;
        }
        if (idade < 18) {
            return res.status(400).json({ error: "Apenas maiores de 18 anos podem criar uma conta master!" });
        }
        const hashedSenhaMaster = await bcryptjs_1.default.hash(senha_master, 10);
        const hashedSenhaFilho = await bcryptjs_1.default.hash(senha_filho, 10);
        const resultado = await prisma.$transaction(async (tx) => {
            const novoAdulto = await tx.usuarios_master.create({
                data: {
                    nome_completo,
                    cpf,
                    senha: hashedSenhaMaster,
                    data_nascimento: dataNascAdulto,
                    status_kyc: 'Pendente',
                    wallet_saldo: 0.00
                }
            });
            const novoDependente = await tx.usuarios_dependentes.create({
                data: {
                    id_master_fk: novoAdulto.id_master,
                    nickname: nickname_filho,
                    senha: hashedSenhaFilho,
                    data_nascimento: new Date(nascimento_filho),
                    moedas_virtuais: 0
                }
            });
            return { pai: novoAdulto, filho: novoDependente };
        });
        // Removendo as senhas antes de enviar a resposta
        const { senha: _, ...paiSemSenha } = resultado.pai;
        const { senha: __, ...filhoSemSenha } = resultado.filho;
        return res.status(201).json({
            message: "Cadastro realizado com total segurança!",
            dados: { pai: paiSemSenha, filho: filhoSemSenha }
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno ao processar o cadastro de segurança." });
    }
});
// =========================================================================
// ROTA DE LOGIN: RESPONSÁVEL (PAI)
// =========================================================================
app.post('/api/login/responsavel', async (req, res) => {
    const { cpf, senha } = req.body;
    if (!cpf || !senha)
        return res.status(400).json({ error: "CPF e Senha são obrigatórios!" });
    try {
        const usuario = await prisma.usuarios_master.findUnique({ where: { cpf } });
        if (!usuario)
            return res.status(404).json({ error: "Usuário não encontrado." });
        const isMatch = await bcryptjs_1.default.compare(senha, usuario.senha);
        if (!isMatch)
            return res.status(401).json({ error: "Senha inválida." });
        const token = jsonwebtoken_1.default.sign({ id: usuario.id_master, role: 'master' }, JWT_SECRET, { expiresIn: '1d' });
        const { senha: _, ...userSafe } = usuario;
        return res.json({ message: "Login realizado com sucesso!", token, user: { ...userSafe, role: 'master' } });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno ao processar o login." });
    }
});
// =========================================================================
// ROTA DE LOGIN: DEPENDENTE (FILHO)
// =========================================================================
app.post('/api/login/dependente', async (req, res) => {
    const { nickname, senha } = req.body;
    if (!nickname || !senha)
        return res.status(400).json({ error: "Nickname e Senha são obrigatórios!" });
    try {
        const usuario = await prisma.usuarios_dependentes.findFirst({ where: { nickname } });
        if (!usuario)
            return res.status(404).json({ error: "Usuário não encontrado." });
        const isMatch = await bcryptjs_1.default.compare(senha, usuario.senha);
        if (!isMatch)
            return res.status(401).json({ error: "Senha inválida." });
        const token = jsonwebtoken_1.default.sign({ id: usuario.id_dependente, role: 'dependente' }, JWT_SECRET, { expiresIn: '1d' });
        const { senha: _, ...userSafe } = usuario;
        return res.json({ message: "Login realizado com sucesso!", token, user: { ...userSafe, role: 'dependente' } });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno ao processar o login." });
    }
});
// =========================================================================
// ROTA DO ÁLBUM: MEU ÁLBUM (Somente Crianças Autenticadas)
// =========================================================================
app.get('/api/album/meu-album', exports.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const userRole = req.userRole;
    if (userRole !== 'dependente') {
        return res.status(403).json({ error: "Apenas crianças podem acessar o álbum virtual." });
    }
    try {
        const meuAlbum = await prisma.usuarios_figurinhas.findMany({
            where: { id_dependente_fk: userId },
            include: { figurinha: true }
        });
        return res.json({ album: meuAlbum });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao buscar álbum." });
    }
});
// =========================================================================
// ROTA DO ÁLBUM: ABRIR PACOTINHO (Ganha 5 figurinhas aleatórias)
// =========================================================================
app.post('/api/album/abrir-pacotinho', exports.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const userRole = req.userRole;
    if (userRole !== 'dependente') {
        return res.status(403).json({ error: "Apenas crianças podem abrir pacotinhos." });
    }
    try {
        // Busca todas as figurinhas possíveis para sorteio
        const catalogo = await prisma.figurinhas_catalogo.findMany();
        if (catalogo.length === 0) {
            return res.status(400).json({ error: "O catálogo de figurinhas está vazio." });
        }
        // Sorteia 5 figurinhas
        const ganhas = [];
        for (let i = 0; i < 5; i++) {
            const randomIndex = Math.floor(Math.random() * catalogo.length);
            ganhas.push(catalogo[randomIndex]);
        }
        // Salva no banco (se já existe, aumenta a quantidade. Se não, cria)
        const novasParaSalvar = [];
        await prisma.$transaction(async (tx) => {
            for (const fig of ganhas) {
                const registroExistente = await tx.usuarios_figurinhas.findFirst({
                    where: { id_dependente_fk: userId, id_figurinha_fk: fig.id_figurinha }
                });
                if (registroExistente) {
                    await tx.usuarios_figurinhas.update({
                        where: { id_registro: registroExistente.id_registro },
                        data: { quantidade: (registroExistente.quantidade || 1) + 1 }
                    });
                    novasParaSalvar.push({ ...fig, is_nova: false });
                }
                else {
                    await tx.usuarios_figurinhas.create({
                        data: {
                            id_dependente_fk: userId,
                            id_figurinha_fk: fig.id_figurinha,
                            quantidade: 1,
                            colada: true // Assume-se que a primeira figurinha já vai pro álbum
                        }
                    });
                    novasParaSalvar.push({ ...fig, is_nova: true });
                }
            }
        });
        return res.status(200).json({
            message: "Pacotinho aberto com sucesso!",
            figurinhas: novasParaSalvar
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao abrir pacotinho." });
    }
});
// =========================================================================
// ROTA DA FEIRA DE TROCAS: CRIAR OFERTA (CRIANÇAS)
// =========================================================================
app.post('/api/trocas/criar-oferta', exports.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const userRole = req.userRole;
    if (userRole !== 'dependente')
        return res.status(403).json({ error: "Apenas crianças podem criar ofertas." });
    const { id_figurinha_ofertada, id_figurinha_solicitada } = req.body;
    if (!id_figurinha_ofertada || !id_figurinha_solicitada)
        return res.status(400).json({ error: "Faltam figurinhas na oferta." });
    try {
        // Valida se a criança TEM a figurinha e ela é repetida
        const inventario = await prisma.usuarios_figurinhas.findFirst({
            where: { id_dependente_fk: userId, id_figurinha_fk: id_figurinha_ofertada }
        });
        if (!inventario || (inventario.quantidade ?? 0) <= 1) {
            return res.status(400).json({ error: "Você não tem figurinhas repetidas suficientes desta para ofertar." });
        }
        const novaOferta = await prisma.autorizacoes_troca.create({
            data: {
                id_figurinha_ofertada,
                id_figurinha_solicitada,
                id_crianca_propos: userId,
                status_troca: 'Aberta'
            }
        });
        return res.status(201).json({ message: "Oferta lançada na Feira Global com sucesso!", oferta: novaOferta });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno ao criar oferta." });
    }
});
// =========================================================================
// ROTA DA FEIRA DE TROCAS: VER OFERTAS GLOBAIS (CRIANÇAS)
// =========================================================================
app.get('/api/trocas/feira-global', exports.authMiddleware, async (req, res) => {
    try {
        const ofertas = await prisma.autorizacoes_troca.findMany({
            where: { status_troca: 'Aberta' },
            include: {
                crianca_propos_rel: { select: { nickname: true } },
                figurinha_ofertada_rel: true,
                figurinha_solicitada_rel: true
            }
        });
        return res.json({ ofertas });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao buscar ofertas." });
    }
});
// =========================================================================
// ROTA DA FEIRA DE TROCAS: ACEITAR OFERTA (CRIANÇAS)
// =========================================================================
app.post('/api/trocas/aceitar-oferta', exports.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const userRole = req.userRole;
    if (userRole !== 'dependente')
        return res.status(403).json({ error: "Apenas crianças podem aceitar ofertas." });
    const { id_troca } = req.body;
    if (!id_troca)
        return res.status(400).json({ error: "ID da oferta é obrigatório." });
    try {
        const oferta = await prisma.autorizacoes_troca.findUnique({ where: { id_troca } });
        if (!oferta || oferta.status_troca !== 'Aberta')
            return res.status(404).json({ error: "Oferta não encontrada ou já aceita." });
        if (oferta.id_crianca_propos === userId)
            return res.status(400).json({ error: "Você não pode aceitar sua própria oferta." });
        // Verifica se a criança que está aceitando TEM a figurinha solicitada pela Criança A (repetida)
        const inventarioAceite = await prisma.usuarios_figurinhas.findFirst({
            where: { id_dependente_fk: userId, id_figurinha_fk: oferta.id_figurinha_solicitada }
        });
        if (!inventarioAceite || (inventarioAceite.quantidade ?? 0) <= 1) {
            return res.status(400).json({ error: "Você não tem esta figurinha repetida para dar em troca." });
        }
        // Tudo OK, a oferta muda para "Pendente_Aprovacao" dos pais
        await prisma.autorizacoes_troca.update({
            where: { id_troca },
            data: {
                id_crianca_aceitou: userId,
                status_troca: 'Pendente_Aprovacao'
            }
        });
        return res.json({ message: "Troca aceita! Agora aguardem a aprovação dos Pais." });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno ao aceitar oferta." });
    }
});
// =========================================================================
// ROTA DE TROCAS: VER PENDÊNCIAS (PAIS)
// =========================================================================
app.get('/api/trocas/pendentes', exports.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const userRole = req.userRole;
    if (userRole !== 'master')
        return res.status(403).json({ error: "Apenas pais podem acessar aprovações pendentes." });
    try {
        // Encontra os dependentes deste pai
        const dependentes = await prisma.usuarios_dependentes.findMany({ where: { id_master_fk: userId } });
        const idsDependentes = dependentes.map(d => d.id_dependente);
        // Busca trocas Pendentes onde o filho propôs (Pai 1) ou o filho aceitou (Pai 2)
        const pendentes = await prisma.autorizacoes_troca.findMany({
            where: {
                status_troca: 'Pendente_Aprovacao',
                OR: [
                    { id_crianca_propos: { in: idsDependentes } },
                    { id_crianca_aceitou: { in: idsDependentes } }
                ]
            },
            include: {
                crianca_propos_rel: { select: { nickname: true } },
                crianca_aceitou_rel: { select: { nickname: true } },
                figurinha_ofertada_rel: true,
                figurinha_solicitada_rel: true
            }
        });
        return res.json({ pendentes });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao buscar pendências." });
    }
});
// =========================================================================
// ROTA DE TROCAS: APROVAR TROCA (PAIS)
// =========================================================================
app.post('/api/trocas/aprovar', exports.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const userRole = req.userRole;
    if (userRole !== 'master')
        return res.status(403).json({ error: "Acesso restrito para pais." });
    const { id_troca, aprovado } = req.body; // aprovado: boolean
    try {
        const troca = await prisma.autorizacoes_troca.findUnique({ where: { id_troca } });
        if (!troca || troca.status_troca !== 'Pendente_Aprovacao')
            return res.status(404).json({ error: "Troca inválida." });
        const dependentes = await prisma.usuarios_dependentes.findMany({ where: { id_master_fk: userId } });
        const idsDependentes = dependentes.map(d => d.id_dependente);
        const isPai1 = idsDependentes.includes(troca.id_crianca_propos);
        const isPai2 = troca.id_crianca_aceitou ? idsDependentes.includes(troca.id_crianca_aceitou) : false;
        if (!isPai1 && !isPai2)
            return res.status(403).json({ error: "Este filho não pertence a você." });
        // Se reprovou
        if (!aprovado) {
            await prisma.autorizacoes_troca.update({
                where: { id_troca },
                data: { status_troca: 'Recusada' }
            });
            return res.json({ message: "Troca recusada com sucesso." });
        }
        // Se aprovou, atualiza o status de aprovação de acordo com quem é o pai
        const updateData = {};
        if (isPai1)
            updateData.pai_1_aprovou = true;
        if (isPai2)
            updateData.pai_2_aprovou = true;
        const trocaAtualizada = await prisma.autorizacoes_troca.update({
            where: { id_troca },
            data: updateData
        });
        // Se ambos os pais já aprovarem, efetiva a troca!
        if (trocaAtualizada.pai_1_aprovou && trocaAtualizada.pai_2_aprovou) {
            await prisma.$transaction(async (tx) => {
                // Diminui quantidade (tira do inventário de A a ofertada, tira do B a solicitada)
                const invA = await tx.usuarios_figurinhas.findFirst({ where: { id_dependente_fk: troca.id_crianca_propos, id_figurinha_fk: troca.id_figurinha_ofertada } });
                const invB = await tx.usuarios_figurinhas.findFirst({ where: { id_dependente_fk: troca.id_crianca_aceitou, id_figurinha_fk: troca.id_figurinha_solicitada } });
                await tx.usuarios_figurinhas.update({ where: { id_registro: invA.id_registro }, data: { quantidade: invA.quantidade - 1 } });
                await tx.usuarios_figurinhas.update({ where: { id_registro: invB.id_registro }, data: { quantidade: invB.quantidade - 1 } });
                // Adiciona as novas (cria ou atualiza quantidade)
                // Para A (ganha a solicitada)
                const targetA = await tx.usuarios_figurinhas.findFirst({ where: { id_dependente_fk: troca.id_crianca_propos, id_figurinha_fk: troca.id_figurinha_solicitada } });
                if (targetA) {
                    await tx.usuarios_figurinhas.update({ where: { id_registro: targetA.id_registro }, data: { quantidade: targetA.quantidade + 1 } });
                }
                else {
                    await tx.usuarios_figurinhas.create({ data: { id_dependente_fk: troca.id_crianca_propos, id_figurinha_fk: troca.id_figurinha_solicitada, quantidade: 1, colada: true } });
                }
                // Para B (ganha a ofertada)
                const targetB = await tx.usuarios_figurinhas.findFirst({ where: { id_dependente_fk: troca.id_crianca_aceitou, id_figurinha_fk: troca.id_figurinha_ofertada } });
                if (targetB) {
                    await tx.usuarios_figurinhas.update({ where: { id_registro: targetB.id_registro }, data: { quantidade: targetB.quantidade + 1 } });
                }
                else {
                    await tx.usuarios_figurinhas.create({ data: { id_dependente_fk: troca.id_crianca_aceitou, id_figurinha_fk: troca.id_figurinha_ofertada, quantidade: 1, colada: true } });
                }
                // Marca a troca como Autorizada
                await tx.autorizacoes_troca.update({
                    where: { id_troca },
                    data: { status_troca: 'Autorizada' }
                });
            });
            return res.json({ message: "Troca aprovada! Como ambos aprovaram, a troca foi efetuada com sucesso!" });
        }
        return res.json({ message: "Troca aprovada pelo seu lado. Aguardando aprovação do outro Responsável." });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao aprovar troca." });
    }
});
// =========================================================================
// ROTA DE CHAT: NOVA SALA OU RETORNAR EXISTENTE
// =========================================================================
app.post('/api/chat/nova-sala', exports.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const userRole = req.userRole;
    if (userRole !== 'dependente')
        return res.status(403).json({ error: "Apenas crianças podem criar chats." });
    const { nickname_amigo } = req.body;
    if (!nickname_amigo)
        return res.status(400).json({ error: "Nickname do amigo é obrigatório." });
    try {
        const crianca1 = await prisma.usuarios_dependentes.findUnique({ where: { id_dependente: userId } });
        const crianca2 = await prisma.usuarios_dependentes.findFirst({ where: { nickname: nickname_amigo } });
        if (!crianca1 || !crianca2)
            return res.status(404).json({ error: "Amigo não encontrado." });
        if (crianca1.id_dependente === crianca2.id_dependente)
            return res.status(400).json({ error: "Não pode conversar consigo mesmo." });
        // Verifica se a sala já existe (independente da ordem)
        let sala = await prisma.salas_chat.findFirst({
            where: {
                OR: [
                    { id_crianca_1: crianca1.id_dependente, id_crianca_2: crianca2.id_dependente },
                    { id_crianca_1: crianca2.id_dependente, id_crianca_2: crianca1.id_dependente }
                ]
            }
        });
        if (!sala) {
            // Cria a sala vinculando os dois pais
            sala = await prisma.salas_chat.create({
                data: {
                    id_crianca_1: crianca1.id_dependente,
                    id_crianca_2: crianca2.id_dependente,
                    id_pai_1: crianca1.id_master_fk,
                    id_pai_2: crianca2.id_master_fk,
                    status_sala: 'Ativa'
                }
            });
        }
        return res.json({ message: "Sala pronta", sala });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao abrir sala de chat." });
    }
});
// =========================================================================
// ROTA DE CHAT: ENVIAR MENSAGEM (COM MODERAÇÃO DE IA/FILTRO)
// =========================================================================
app.post('/api/chat/mensagem', exports.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const userRole = req.userRole;
    if (userRole !== 'dependente')
        return res.status(403).json({ error: "Apenas crianças enviam mensagens." });
    const { id_sala, conteudo } = req.body;
    if (!id_sala || !conteudo)
        return res.status(400).json({ error: "Sala e conteúdo são obrigatórios." });
    try {
        const sala = await prisma.salas_chat.findUnique({ where: { id_sala } });
        if (!sala)
            return res.status(404).json({ error: "Sala não encontrada." });
        if (sala.id_crianca_1 !== userId && sala.id_crianca_2 !== userId) {
            return res.status(403).json({ error: "Você não pertence a esta sala." });
        }
        // Filtro MVP: Palavras Proibidas e Números de Telefone (Sequência de 5 ou mais números)
        const palavrasProibidas = ['bobo', 'feio', 'chato', 'idiota'];
        let status = 'Aprovada';
        let motivo = null;
        const conteudoLower = conteudo.toLowerCase();
        const hasPalavrão = palavrasProibidas.some(palavra => conteudoLower.includes(palavra));
        const hasTelefone = /\d{5,}/.test(conteudo); // Mais de 4 números seguidos
        if (hasPalavrão || hasTelefone) {
            status = 'Bloqueada_Por_IA';
            motivo = hasTelefone ? 'Tentativa de enviar telefone/contato' : 'Uso de palavra não permitida';
        }
        const msg = await prisma.mensagens_chat.create({
            data: {
                id_sala_fk: id_sala,
                id_enviou_fk: userId,
                conteudo_mensagem: status === 'Aprovada' ? conteudo : '*** [MENSAGEM BLOQUEADA PELO FILTRO DE SEGURANÇA] ***',
                status_moderacao: status,
                motivo_bloqueio: motivo
            }
        });
        return res.json({ message: "Mensagem processada.", msg });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao enviar mensagem." });
    }
});
// =========================================================================
// ROTA DE CHAT: LER MENSAGENS
// =========================================================================
app.get('/api/chat/sala/:id_sala', exports.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const { id_sala } = req.params;
    try {
        const sala = await prisma.salas_chat.findUnique({ where: { id_sala: Number(id_sala) } });
        if (!sala)
            return res.status(404).json({ error: "Sala não encontrada." });
        // Apenas as crianças da sala ou os pais respectivos podem ler
        const canRead = req.userRole === 'dependente' ? (sala.id_crianca_1 === userId || sala.id_crianca_2 === userId) :
            (sala.id_pai_1 === userId || sala.id_pai_2 === userId);
        if (!canRead)
            return res.status(403).json({ error: "Sem permissão para ler este chat." });
        const mensagens = await prisma.mensagens_chat.findMany({
            where: { id_sala_fk: Number(id_sala) },
            orderBy: { data_envio: 'asc' },
            include: { enviou: { select: { nickname: true } } }
        });
        return res.json({ mensagens });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao ler mensagens." });
    }
});
// =========================================================================
// MÓDULO FINANCEIRO: CARTEIRA DO PAI (R$) E DEPÓSITO
// =========================================================================
app.get('/api/financeiro/saldo-pai', exports.authMiddleware, async (req, res) => {
    const userId = req.userId;
    if (req.userRole !== 'master')
        return res.status(403).json({ error: "Acesso restrito para pais." });
    try {
        const pai = await prisma.usuarios_master.findUnique({ where: { id_master: userId } });
        return res.json({ saldo_reais: pai?.saldo_reais || 0 });
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao buscar saldo." });
    }
});
app.post('/api/financeiro/depositar', exports.authMiddleware, async (req, res) => {
    const userId = req.userId;
    if (req.userRole !== 'master')
        return res.status(403).json({ error: "Acesso restrito para pais." });
    const { valor } = req.body;
    if (!valor || valor <= 0)
        return res.status(400).json({ error: "Valor de depósito inválido." });
    try {
        const pai = await prisma.usuarios_master.update({
            where: { id_master: userId },
            data: { saldo_reais: { increment: valor } }
        });
        return res.json({ message: "Depósito realizado com sucesso!", saldo_reais: pai.saldo_reais });
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao depositar." });
    }
});
// =========================================================================
// MÓDULO FINANCEIRO: TRANSFERIR MESADA (PAI -> FILHO)
// Taxa: R$ 1,00 = 100 Moedas Virtuais
// =========================================================================
app.post('/api/financeiro/transferir-mesada', exports.authMiddleware, async (req, res) => {
    const userId = req.userId;
    if (req.userRole !== 'master')
        return res.status(403).json({ error: "Acesso restrito para pais." });
    const { id_dependente, valor_reais } = req.body;
    if (!valor_reais || valor_reais <= 0)
        return res.status(400).json({ error: "Valor inválido." });
    try {
        const pai = await prisma.usuarios_master.findUnique({ where: { id_master: userId } });
        if (!pai || Number(pai.saldo_reais) < valor_reais) {
            return res.status(400).json({ error: "Saldo insuficiente." });
        }
        const moedasConvertidas = valor_reais * 100;
        await prisma.$transaction(async (tx) => {
            // Deduz do pai
            await tx.usuarios_master.update({
                where: { id_master: userId },
                data: { saldo_reais: { decrement: valor_reais } }
            });
            // Credita na carteira digital da criança
            let dependente = await tx.usuarios_dependentes.findUnique({ where: { id_dependente } });
            if (dependente) {
                await tx.usuarios_dependentes.update({
                    where: { id_dependente },
                    data: { moedas_virtuais: { increment: moedasConvertidas } }
                });
            }
        });
        return res.json({ message: `Mesada de ${moedasConvertidas} moedas transferida com sucesso!` });
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao transferir mesada." });
    }
});
// =========================================================================
// MÓDULO FINANCEIRO: CARTEIRA DA CRIANÇA E COMPRA DE PACOTINHOS
// =========================================================================
app.get('/api/financeiro/saldo-crianca', exports.authMiddleware, async (req, res) => {
    const userId = req.userId;
    if (req.userRole !== 'dependente')
        return res.status(403).json({ error: "Acesso restrito." });
    try {
        let dependente = await prisma.usuarios_dependentes.findUnique({ where: { id_dependente: userId } });
        return res.json({ saldo_moedas: dependente?.moedas_virtuais || 0 });
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao buscar saldo." });
    }
});
app.post('/api/financeiro/comprar-pacote-com-moedas', exports.authMiddleware, async (req, res) => {
    const userId = req.userId;
    if (req.userRole !== 'dependente')
        return res.status(403).json({ error: "Acesso restrito." });
    const PRECO_PACOTE = 200; // 200 Moedas
    try {
        const dependente = await prisma.usuarios_dependentes.findUnique({ where: { id_dependente: userId } });
        if (!dependente || (dependente.moedas_virtuais || 0) < PRECO_PACOTE) {
            return res.status(400).json({ error: "Saldo de moedas insuficiente. Peça mais mesada!" });
        }
        const catalogo = await prisma.figurinhas_catalogo.findMany();
        if (catalogo.length === 0)
            return res.status(400).json({ error: "O catálogo de figurinhas está vazio." });
        const ganhas = [];
        for (let i = 0; i < 5; i++) {
            ganhas.push(catalogo[Math.floor(Math.random() * catalogo.length)]);
        }
        const novasParaSalvar = [];
        await prisma.$transaction(async (tx) => {
            // Cobra as moedas
            await tx.usuarios_dependentes.update({
                where: { id_dependente: userId },
                data: { moedas_virtuais: { decrement: PRECO_PACOTE } }
            });
            for (const fig of ganhas) {
                const registroExistente = await tx.usuarios_figurinhas.findFirst({
                    where: { id_dependente_fk: userId, id_figurinha_fk: fig.id_figurinha }
                });
                if (registroExistente) {
                    await tx.usuarios_figurinhas.update({
                        where: { id_registro: registroExistente.id_registro },
                        data: { quantidade: (registroExistente.quantidade || 1) + 1 }
                    });
                    novasParaSalvar.push({ ...fig, is_nova: false });
                }
                else {
                    await tx.usuarios_figurinhas.create({
                        data: {
                            id_dependente_fk: userId,
                            id_figurinha_fk: fig.id_figurinha,
                            quantidade: 1,
                            colada: true
                        }
                    });
                    novasParaSalvar.push({ ...fig, is_nova: true });
                }
            }
        });
        return res.status(200).json({ message: "Pacotinho comprado com sucesso!", figurinhas: novasParaSalvar });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao comprar pacotinho." });
    }
});
// =========================================================================
// MÓDULO DE APOSTAS: ARENA PARA OS PAIS
// =========================================================================
app.post('/api/apostas/nova', exports.authMiddleware, async (req, res) => {
    const userId = req.userId;
    if (req.userRole !== 'master')
        return res.status(403).json({ error: "Apenas pais podem apostar." });
    const { valor_apostado, tipo_aposta, odd } = req.body;
    if (!valor_apostado || valor_apostado <= 0)
        return res.status(400).json({ error: "Valor de aposta inválido." });
    try {
        const pai = await prisma.usuarios_master.findUnique({ where: { id_master: userId } });
        if (!pai || Number(pai.saldo_reais) < valor_apostado) {
            return res.status(400).json({ error: "Saldo em Reais (R$) insuficiente." });
        }
        const aposta = await prisma.$transaction(async (tx) => {
            await tx.usuarios_master.update({
                where: { id_master: userId },
                data: { saldo_reais: { decrement: valor_apostado } }
            });
            return await tx.apostas_arena.create({
                data: {
                    id_master_fk: userId,
                    evento_descricao: req.body.evento_descricao || 'Aposta Personalizada',
                    premio_potencial: Number(valor_apostado) * Number(odd),
                    valor_apostado,
                    tipo_aposta,
                    cota_odd: odd,
                    status_aposta: 'Ativa'
                }
            });
        });
        return res.status(201).json({ message: "Aposta realizada! Boa sorte.", aposta });
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao realizar aposta." });
    }
});
app.post('/api/apostas/resolver', exports.authMiddleware, async (req, res) => {
    // Rota que um Admin ou CronJob chamaria na vida real. Aqui simulamos permitindo o próprio Pai chamar.
    const userId = req.userId;
    const { id_aposta, resultado } = req.body; // resultado: "Ganha" ou "Perdida"
    try {
        const aposta = await prisma.apostas_arena.findUnique({ where: { id_aposta } });
        if (!aposta || aposta.status_aposta !== 'Ativa')
            return res.status(400).json({ error: "Aposta inválida." });
        await prisma.$transaction(async (tx) => {
            await tx.apostas_arena.update({
                where: { id_aposta },
                data: { status_aposta: resultado }
            });
            if (resultado === 'Ganha') {
                const premio = Number(aposta.valor_apostado) * Number(aposta.cota_odd);
                await tx.usuarios_master.update({
                    where: { id_master: aposta.id_master_fk },
                    data: { saldo_reais: { increment: premio } }
                });
            }
        });
        return res.json({ message: `Aposta resolvida como ${resultado}!` });
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao resolver aposta." });
    }
});
// Inicialização do Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Fortaleza de Segurança rodando na porta ${PORT}`);
});
//# sourceMappingURL=server.js.map