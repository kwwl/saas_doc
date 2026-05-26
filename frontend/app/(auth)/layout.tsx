/**
 * Layout for unauthenticated pages (login, register).
 * Centered card-style container — actual auth-redirect logic
 * (rerouting if already logged in) lives in `feature/frontend-auth`.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
