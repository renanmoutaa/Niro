import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { authConfig } from "@/auth.config";

// Função para obter o banco de dados apenas quando necessário
function getDb() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url) {
    // Durante o build do Next.js, as variáveis podem não estar presentes.
    // Retornamos um objeto vazio ou null para não quebrar o build,
    // já que o authorize só será chamado em runtime (quando o site estiver rodando).
    console.warn("DATABASE_URL não definida em tempo de execução/build.");
    return null;
  }

  const client = createClient({
    url: url,
    authToken: authToken,
  });
  return drizzle(client);
}

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

        const db = getDb();
        if (!db) {
          console.error("Banco de dados não inicializado.");
          return null;
        }

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
