import type { ReactNode } from "react";

import { CommandCenterBar } from "@/components/layout/CommandCenterBar";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastStack } from "@/components/layout/ToastStack";
import { Topbar } from "@/components/layout/Topbar";

interface AppLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AppLayout({ title, subtitle, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-surface">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <CommandCenterBar />
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
        <Footer />
      </div>
      <ToastStack />
    </div>
  );
}
