-- Lógica para checar a porcentagem de conclusão da Fase 1 de uma criança específica
SELECT 
    (COUNT(DISTINCT uf.id_figurinha_fk) * 100.0 / (SELECT COUNT(*) FROM figurinhas_catalogo WHERE fase_grupo = 1)) AS porcentagem_conclusao
FROM 
    usuarios_figurinhas uf
JOIN 
    figurinhas_catalogo fc ON uf.id_figurinha_fk = fc.id_figurinha
WHERE 
    uf.id_dependente_fk = :id_da_crianca -- Substitui pelo ID da criança sendo avaliada
    AND fc.fase_grupo = 1;

-- QUERY DO MATCH PERFEITO: Encontra trocas ideais entre duas crianças
SELECT 
    meu_album.id_dependente_fk AS meu_id,
    outro_album.id_dependente_fk AS id_parceiro_troca,
    fc1.nome_jogador AS figurinha_que_eu_vou_ganhar,
    fc2.nome_jogador AS figurinha_que_eu_vou_dar
FROM 
    usuarios_figurinhas meu_album
-- 1. Encontra alguém que tem uma figurinha que eu não tenho (ou que tenho menos)
JOIN 
    usuarios_figurinhas outro_album ON meu_album.id_figurinha_fk != outro_album.id_figurinha_fk
-- 2. Garante que o outro tem em quantidade de repetida (quantidade > 1)
    AND outro_album.quantidade > 1
-- 3. Traz as informações das figurinhas do catálogo
JOIN 
    figurinhas_catalogo fc1 ON outro_album.id_figurinha_fk = fc1.id_figurinha
JOIN 
    figurinhas_catalogo fc2 ON meu_album.id_figurinha_fk = fc2.id_figurinha
WHERE 
    meu_album.id_dependente_fk = :meu_id_crianca -- Filtra pela criança logada
    AND meu_album.quantidade > 1 -- Eu preciso ter a repetida para oferecer
    AND outro_album.id_dependente_fk != :meu_id_crianca -- Não faz match comigo mesmo
LIMIT 10;
