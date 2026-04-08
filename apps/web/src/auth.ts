import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { authConfig } from "./auth.config";

// Configuração para o Turso (LibSQL)
const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});
const db = drizzle(client);

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

        try {
          const user = await db.select().from(users).where(eq(users.email, credentials.email as string)).get();

          if (user && await bcrypt.compare(credentials.password as string, user.password)) {
            return { id: user.id, email: user.email };
          }
        } catch (error) {
          console.error('Erro na autenticação:', error);
          return null;
        }
        
        return null;
      }
    }),
  ],
});
