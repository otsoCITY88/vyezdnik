// Auth.js v5 конфиг — credentials provider для прототипа (email + пароль = email).
// Для прода поменять на Email magic-link через nodemailer.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "jwt" },
  // ВАЖНО: указываем ТОЛЬКО signIn. Если задать pages.signOut/error — Auth.js v5
  // в связке с server-action signOut перестаёт корректно делать редирект и
  // возвращает пустой ответ ⇒ браузер показывает белую страницу. Дефолтные
  // системные страницы Auth.js (англ.) пользователь не увидит, потому что:
  //   • signOut делается через наш server action в lib/auth-actions.ts
  //   • error → редиректит на /login?error=… (мы это обрабатываем сами)
  //   • любой неаутентифицированный URL middleware заворачивает на /login
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "E-mail",
      credentials: {
        email: { label: "E-mail", type: "email" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "").trim().toLowerCase();
        if (!email) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        (session.user as { id?: string }).id = String(token.uid);
      }
      return session;
    },
  },
});
