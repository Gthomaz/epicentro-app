const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
require('dotenv').config();

const libsql = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});
const adapter = new PrismaLibSql(libsql);
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const novoAdulto = await tx.usuarios_master.create({
                data: {
                    nome_completo: 'Teste Pai',
                    cpf: '12345678901',
                    senha: 'hash',
                    data_nascimento: new Date('1990-01-01'),
                    status_kyc: 'Pendente',
                    wallet_saldo: 0.00
                }
            });

            const novoDependente = await tx.usuarios_dependentes.create({
                data: {
                    id_master_fk: novoAdulto.id_master,
                    nickname: 'teste_filho',
                    senha: 'hash',
                    data_nascimento: new Date('2015-01-01'),
                    moedas_virtuais: 0
                }
            });

            return { pai: novoAdulto, filho: novoDependente };
        });
        console.log(resultado);
    } catch (e) {
        console.error("ERROR:");
        console.error(e);
    }
}
main();
