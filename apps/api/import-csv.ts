import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { leads } from '../../packages/db/schema';

const CSV_PATH = join(__dirname, '../../../connected_clients_rows.csv');
const DB_PATH = join(__dirname, '../../packages/db/sqlite.db');

async function importCsv() {
  if (!existsSync(CSV_PATH)) {
    console.error(`CSV file not found at: ${CSV_PATH}`);
    process.exit(1);
  }

  const sqlite = new Database(DB_PATH);
  const db = drizzle(sqlite);

  const fileContent = readFileSync(CSV_PATH, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Found ${records.length} records. Importing...`);

  for (const record of records) {
    try {
      await db.insert(leads).values({
        id: record.id,
        name: record.name,
        email: record.email,
        device: record.device,
        ip: record.ip,
        mac: record.mac,
        status: record.status,
        location: record.location,
        bandwidthUsed: record.bandwidth_used ? parseInt(record.bandwidth_used) : 0,
        connectedAt: record.connected_at,
        lastSeen: record.last_seen,
        phone: record.phone,
        cpf: record.cpf,
      }).onConflictDoNothing();
    } catch (err) {
      console.error(`Error importing record ${record.id}:`, err);
    }
  }

  console.log('Import finished successfully.');
  sqlite.close();
}

importCsv();
