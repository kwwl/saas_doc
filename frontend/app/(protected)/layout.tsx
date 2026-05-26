/**
 * Layout for authenticated pages (dashboard, clients, documents).
 * Minimal shell for now — JWT verification middleware, nav bar, and
 * the auth-context provider will land in `feature/frontend-auth`.
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
