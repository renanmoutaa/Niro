import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const DB_PATH = path.join(process.cwd(), '../../packages/db/sqlite.db');
const db = new Database(DB_PATH);

const lead = {
  id: uuidv4(),
  name: 'Cliente Teste Niro',
  email: 'teste.novo@niro.com', // Unique email
  phone: '(11) 99999-9999',
  cpf: '123.456.789-00',
  age: '35',
  income: '8500',
  neighborhood: 'Brooklin',
  city: 'São Paulo',
  state: 'SP',
  status: 'default',
  location: 'São Paulo / SP'
};

try {
  const stmt = db.prepare(`
    INSERT INTO leads (id, name, email, phone, cpf, age, income, neighborhood, city, state, status, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    lead.id, 
    lead.name, 
    lead.email, 
    lead.phone, 
    lead.cpf, 
    lead.age, 
    lead.income, 
    lead.neighborhood, 
    lead.city, 
    lead.state, 
    lead.status, 
    lead.location
  );
  
  console.log('Lead de teste inserido com sucesso!');
} catch (err) {
  console.error('Erro ao inserir lead:', err.message);
} finally {
  db.close();
}
