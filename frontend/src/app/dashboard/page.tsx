export default function DashboardPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="max-w-md rounded-xl border border-border bg-card p-12 text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Dashboard
        </h1>
        <p className="mt-4 text-muted">
          Connect your firm data to see visibility scores and competitor
          benchmarks. Coming soon.
        </p>
      </div>
    </div>
  );
}
