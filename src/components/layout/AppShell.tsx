import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md px-5 pb-28 md:max-w-2xl md:px-8 lg:max-w-4xl">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground">Em breve</p>
      <p className="mt-2 text-sm font-medium text-foreground/80">{title}</p>
      <p className="mt-1 max-w-[16rem] text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
