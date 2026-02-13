"use client";

import { useStore } from "@/store/useStore";
import { cn } from "@/lib/cn";
import { Terminal, Trash2 } from "lucide-react";

const levelStyles: Record<string, string> = {
  info: "text-zinc-400",
  success: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

export function ActivityLog() {
  const logs = useStore((s) => s.logs);
  const clearLogs = useStore((s) => s.clearLogs);

  return (
    <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/80">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <Terminal className="h-3.5 w-3.5" />
          Real-time log
        </span>
        <button
          type="button"
          onClick={clearLogs}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          aria-label="Clear log"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-[200px] overflow-y-auto p-2 font-mono text-xs">
        {logs.length === 0 ? (
          <p className="text-zinc-600">No activity yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {logs.map((entry) => (
              <li
                key={entry.id}
                className={cn("flex gap-2", levelStyles[entry.level] ?? levelStyles.info)}
              >
                <span className="shrink-0 text-zinc-600">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span>{entry.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
