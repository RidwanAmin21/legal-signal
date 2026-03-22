import Link from "next/link";

export default function Nav() {
  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight text-foreground">
          LegalSignal
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm text-muted hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <Link href="/competitors" className="text-sm text-muted hover:text-foreground transition-colors">
            Competitors
          </Link>
          <Link
            href="/admin/review"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Review Queue
          </Link>
        </div>
      </nav>
    </header>
  );
}
