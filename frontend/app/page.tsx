import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            SaaS Doc
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            Gestion documentaire pour cabinets comptables.
          </p>
          <p className="text-sm text-muted-foreground">
            Centralisez, organisez et suivez les documents de vos clients.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login" className={buttonVariants({ size: "lg" })}>
            Se connecter
          </Link>
          <Link
            href="/register"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Créer un compte
          </Link>
        </div>
      </div>
    </main>
  );
}
