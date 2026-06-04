const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const url = "libsql://epicentro-db-gthomaz.aws-ap-south-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODA1OTMzMzAsImlkIjoiMDE5ZTkzYTEtM2QwMS03NmYyLTllNzUtNTM2NzkwY2ViMmQxIiwicmlkIjoiOWZhNjI2MDktODA0YS00NDliLWJkNmYtNmIxMDE0OTgxN2Y5In0.twobXMkDTYaxjgcdPDRyStElxmcWVe4Eb6g1NaZXkvsd8rtnWiUWaa3VxCf-bR8RW_xMVB-iGL--kh7-5_vGCA";

async function pushSchema() {
    const db = createClient({ url, authToken });
    const schemaPath = path.join(__dirname, 'turso-schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    console.log(`Encontrados ${statements.length} comandos SQL. Executando na Turso...`);
    
    for (const statement of statements) {
        try {
            await db.execute(statement);
            console.log(`[OK] Executado: ${statement.substring(0, 50)}...`);
        } catch (e) {
            console.error(`[ERRO] Falha ao executar: ${statement.substring(0, 50)}...`);
            console.error(e.message);
        }
    }
    
    console.log("Migração concluída!");
}

pushSchema();
