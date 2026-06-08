const fs = require('fs');
let sql = fs.readFileSync('backend/turso-schema.sql', 'utf8');
sql = sql.replace(/CREATE TABLE "(.+?)"/g, 'DROP TABLE IF EXISTS "$1";\nCREATE TABLE "$1"');
sql = sql.replace(/CREATE UNIQUE INDEX/g, 'DROP INDEX IF EXISTS "usuarios_master_cpf_key";\nCREATE UNIQUE INDEX');
fs.writeFileSync('backend/turso-schema-fixed.sql', sql);
