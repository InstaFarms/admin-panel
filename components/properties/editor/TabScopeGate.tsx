"use client";

import { Lock } from "lucide-react";
import type { ReactNode } from "react";

interface TabScopeGateProps {
  locked: boolean;
  message: string;
  children: ReactNode;
}

export default function TabScopeGate({ locked, message, children }: TabScopeGateProps) {
  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-start justify-center pt-20">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-8 py-6 text-center shadow-xl dark:border-slate-700 dark:bg-slate-900/95">
          <Lock size={24} className="text-slate-400 dark:text-slate-500" />
          <p className="max-w-sm text-sm font-medium text-slate-600 dark:text-slate-300">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
