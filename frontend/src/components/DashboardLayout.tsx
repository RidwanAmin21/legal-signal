import Sidebar from "./Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  firmName?: string;
}

export default function DashboardLayout({ children, firmName }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar firmName={firmName} />
      <main className="ml-56 flex-1 min-h-screen">
        {children}
      </main>
    </div>
  );
}
