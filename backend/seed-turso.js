const { createClient } = require('@libsql/client');

const url = "libsql://epicentro-db-gthomaz.aws-ap-south-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODA1OTMzMzAsImlkIjoiMDE5ZTkzYTEtM2QwMS03NmYyLTllNzUtNTM2NzkwY2ViMmQxIiwicmlkIjoiOWZhNjI2MDktODA0YS00NDliLWJkNmYtNmIxMDE0OTgxN2Y5In0.twobXMkDTYaxjgcdPDRyStElxmcWVe4Eb6g1NaZXkvsd8rtnWiUWaa3VxCf-bR8RW_xMVB-iGL--kh7-5_vGCA";

async function seed() {
    const db = createClient({ url, authToken });
    console.log('Iniciando seed no Turso...');

    // Limpar álbuns (zerar para todo mundo) e trocas para evitar erro de Foreign Key
    await db.execute('DELETE FROM autorizacoes_troca');
    await db.execute('DELETE FROM usuarios_figurinhas');
    await db.execute('DELETE FROM figurinhas_catalogo');

    const figurinhas = [
        { numero_album: 1, nome_jogador: 'Lionel Messi', fase_grupo: 1, raridade: 'Lendária', imagem: 'assets/figurinhas/messi_caricatura.png' },
        { numero_album: 2, nome_jogador: 'Cristiano Ronaldo', fase_grupo: 1, raridade: 'Lendária', imagem: 'assets/figurinhas/cr7_caricatura.png' },
        { numero_album: 3, nome_jogador: 'Neymar Jr', fase_grupo: 1, raridade: 'Rara', imagem: 'assets/figurinhas/ney_caricatura.png' },
        { numero_album: 4, nome_jogador: 'Kylian Mbappé', fase_grupo: 1, raridade: 'Rara', imagem: 'assets/figurinhas/mbappe_caricatura.png' },
        { numero_album: 5, nome_jogador: 'Kevin De Bruyne', fase_grupo: 1, raridade: 'Rara', imagem: 'assets/figurinhas/kdb_caricatura.png' },
        { numero_album: 6, nome_jogador: 'Vinícius Jr', fase_grupo: 1, raridade: 'Comum', imagem: 'assets/figurinhas/vini_caricatura.png' },
        { numero_album: 7, nome_jogador: 'Luka Modric', fase_grupo: 2, raridade: 'Comum', imagem: 'assets/figurinhas/modric_caricatura.png' },
        { numero_album: 8, nome_jogador: 'Erling Haaland', fase_grupo: 2, raridade: 'Rara', imagem: 'assets/figurinhas/haaland_caricatura.png' },
        { numero_album: 9, nome_jogador: 'Jude Bellingham', fase_grupo: 2, raridade: 'Comum', imagem: 'assets/figurinhas/bellingham_caricatura.png' },
        { numero_album: 10, nome_jogador: 'Alisson Becker', fase_grupo: 2, raridade: 'Comum', imagem: 'assets/figurinhas/alisson_caricatura.png' },
    ];

    for (const fig of figurinhas) {
        await db.execute({
            sql: 'INSERT INTO figurinhas_catalogo (numero_album, nome_jogador, fase_grupo, raridade, imagem) VALUES (?, ?, ?, ?, ?)',
            args: [fig.numero_album, fig.nome_jogador, fig.fase_grupo, fig.raridade, fig.imagem]
        });
    }

    console.log('Seed finalizado! 10 figurinhas criadas no catálogo no Turso.');
}

seed();
