import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), '../../packages/db/sqlite.db');
const db = new Database(DB_PATH);

const columns = ['income', 'age', 'neighborhood', 'city', 'state'];

try {
  for (const col of columns) {
    try {
      db.prepare(`ALTER TABLE leads ADD COLUMN ${col} TEXT`).run();
      console.log(`Coluna ${col} adicionada com sucesso.`);
    } catch (e) {
      if (e.message.includes('duplicate column name')) {
        console.log(`Coluna ${col} já existe.`);
      } else {
        console.log(`Erro ao adicionar ${col}: ${e.message}`);
      }
    }
  }
} catch (err) {
  console.error('Erro na migração:', err);
} finally {
  db.close();
}
