import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protege todas as rotas, exceto /login, API de auth e assets estáticos
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
