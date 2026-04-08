import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protege todas as rotas da aplicação, exceto /login e rotas públicas de imagem
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
