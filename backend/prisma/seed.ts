import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaLibSql({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando seed de figurinhas...');

  // Limpar catálogo existente para não duplicar no seed
  await prisma.figurinhas_catalogo.deleteMany();

  const figurinhas = [
    { numero_album: 1, nome_jogador: 'Lionel Messi', fase_grupo: 1, raridade: 'Lendária', imagem: 'https://robohash.org/messi?set=set2&size=150x150' },
    { numero_album: 2, nome_jogador: 'Cristiano Ronaldo', fase_grupo: 1, raridade: 'Lendária', imagem: 'https://robohash.org/cr7?set=set2&size=150x150' },
    { numero_album: 3, nome_jogador: 'Neymar Jr', fase_grupo: 1, raridade: 'Rara', imagem: 'https://robohash.org/neymar?set=set2&size=150x150' },
    { numero_album: 4, nome_jogador: 'Kylian Mbappé', fase_grupo: 1, raridade: 'Rara', imagem: 'https://robohash.org/mbappe?set=set2&size=150x150' },
    { numero_album: 5, nome_jogador: 'Kevin De Bruyne', fase_grupo: 1, raridade: 'Rara', imagem: 'https://robohash.org/debruyne?set=set2&size=150x150' },
    { numero_album: 6, nome_jogador: 'Vinícius Jr', fase_grupo: 1, raridade: 'Comum', imagem: 'https://robohash.org/vini?set=set2&size=150x150' },
    { numero_album: 7, nome_jogador: 'Luka Modric', fase_grupo: 2, raridade: 'Comum', imagem: 'https://robohash.org/modric?set=set2&size=150x150' },
    { numero_album: 8, nome_jogador: 'Erling Haaland', fase_grupo: 2, raridade: 'Rara', imagem: 'https://robohash.org/haaland?set=set2&size=150x150' },
    { numero_album: 9, nome_jogador: 'Jude Bellingham', fase_grupo: 2, raridade: 'Comum', imagem: 'https://robohash.org/bellingham?set=set2&size=150x150' },
    { numero_album: 10, nome_jogador: 'Alisson Becker', fase_grupo: 2, raridade: 'Comum', imagem: 'https://robohash.org/alisson?set=set2&size=150x150' },
  ];

  for (const fig of figurinhas) {
    await prisma.figurinhas_catalogo.create({
      data: fig
    });
  }

  console.log('Seed finalizado! 10 figurinhas criadas no catálogo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
