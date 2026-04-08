import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { users } from '../../packages/db/schema';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'node:path';

const DB_PATH = join(process.cwd(), '../../packages/db/sqlite.db');
const sqlite = new Database(DB_PATH);
const db = drizzle(sqlite);

async function main() {
  const email = 'admin';
  const password = 'Wink@123';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('Seeding user admin...');
  
  await db.insert(users).values({
    id: uuidv4(),
    email,
    password: hashedPassword,
  }).onConflictDoUpdate({
    target: users.email,
    set: {
      password: hashedPassword
    }
  });

  console.log('User admin updated/seeded successfully!');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
