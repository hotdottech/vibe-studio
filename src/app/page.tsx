"use client";

import { DragDropZone } from "@/components/DragDropZone";
import { ComparisonView } from "@/components/ComparisonView";
import { ImageStrip } from "@/components/ImageStrip";
import { ActivityLog } from "@/components/ActivityLog";
import { useStore } from "@/store/useStore";
import { useAIWorker } from "@/hooks/useAIWorker";

export default function Home() {
  useAIWorker();
  const selectedLeft = useStore((s) => s.selectedLeft);
  const selectedRight = useStore((s) => s.selectedRight);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Vibe Compare Studio
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Phase 1 — Ingest &amp; compare. All processing is local; no server upload.
        </p>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <section>
          <DragDropZone />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-medium text-zinc-400">Comparison</h2>
            <ComparisonView
              left={selectedLeft}
              right={selectedRight}
            />
          </div>
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-zinc-400">Activity log</h2>
            <ActivityLog />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-zinc-400">Images</h2>
          <ImageStrip />
        </section>
      </main>
    </div>
  );
}
