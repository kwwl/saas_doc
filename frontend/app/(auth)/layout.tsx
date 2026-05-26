"use client";

/**
 * Layout for unauthenticated pages (login, register).
 * Redirects to /dashboard if the user is already authenticated, so logged-in
 * users hitting /login by mistake land on the app instead of seeing the form.
 *
 * Returns null during the redirect window (and before the auth context is
 * ready) to avoid flashing the form for a logged-in visitor.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { ready, isAuthenticated } = useAuth();

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [ready, isAuthenticated, router]);

  if (!ready || isAuthenticated) return null;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
