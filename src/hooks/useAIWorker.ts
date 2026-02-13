"use client";

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "@/store/useStore";

export function useAIWorker() {
  const workerRef = useRef<Worker | null>(null);
  const addLog = useStore((s) => s.addLog);
  const setEmbedding = useStore((s) => s.setEmbedding);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const worker = new Worker(
      new URL("../worker/ai.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<{ type: string; message?: string; id?: string; embedding?: number[] }>) => {
      const { type, message, id, embedding } = e.data ?? {};
      if (type === "loading" || type === "progress") {
        addLog(message ?? "Loading...", "info");
      } else if (type === "ready") {
        addLog(message ?? "Ready.", "success");
      } else if (type === "embedding" && id && embedding) {
        setEmbedding(id, embedding);
      } else if (type === "error") {
        addLog(message ?? "Worker error", "error");
      }
    };

    worker.onerror = () => {
      addLog("AI worker failed to start.", "error");
    };

    addLog("Loading AI Model...", "info");
    worker.postMessage({ type: "init" });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [addLog, setEmbedding]);

  const computeEmbedding = useCallback((id: string, url: string) => {
    workerRef.current?.postMessage({ type: "embed", id, url });
  }, []);

  return { computeEmbedding };
}
