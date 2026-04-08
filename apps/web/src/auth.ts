import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { authConfig } from "./auth.config";
import path from 'path';

const sqlite = new Database(path.join(process.cwd(), '../../packages/db/sqlite.db'));
const db = drizzle(sqlite);

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
    maxAge: 5 * 60, // 5 minutos
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.select().from(users).where(eq(users.email, credentials.email as string)).get();

        if (user && await bcrypt.compare(credentials.password as string, user.password)) {
          return { id: user.id, email: user.email };
        }
        
        return null;
      }
    }),
  ],
});
