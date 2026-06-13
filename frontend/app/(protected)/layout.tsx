"use client";

/**
 * Layout for authenticated pages (dashboard, clients, documents).
 *
 * Client-side guard: redirects to /login when the auth context is ready and
 * the user is not authenticated. Renders null during the check window to
 * avoid flashing protected content to a logged-out visitor.
 *
 * V2: replace with Next.js middleware once we migrate JWTs to httpOnly cookies.
 * V1's localStorage token can't be read server-side, so middleware isn't usable.
 */
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/clients", label: "Clients" },
] as const;

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace("/login");
    }
  }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated) return null;

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-lg font-semibold tracking-tight"
            >
              SaaS Doc
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "text-muted-foreground transition-colors hover:text-foreground",
                    (pathname === href || pathname.startsWith(`${href}/`)) &&
                      "font-medium text-foreground",
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user && (
              <span className="hidden text-muted-foreground sm:inline">
                {user.email}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Déconnexion
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
