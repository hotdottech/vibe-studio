"use client";

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "@/store/useStore";

export function useAIWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingIdsRef = useRef<Set<string>>(new Set());

  const addLog = useStore((s) => s.addLog);
  const setEmbedding = useStore((s) => s.setEmbedding);
  const clusterImages = useStore((s) => s.clusterImages);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const worker = new Worker(
      new URL("../worker/ai.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    worker.onmessage = (
      e: MessageEvent<{ type: string; message?: string; id?: string; embedding?: number[] }>
    ) => {
      const { type, message, id, embedding } = e.data ?? {};
      if (type === "loading" || type === "progress") {
        addLog(message ?? "Loading...", "info");
      } else if (type === "ready") {
        addLog(message ?? "Model ready.", "success");
      } else if (type === "embedding" && id && embedding) {
        setEmbedding(id, embedding);
        pendingIdsRef.current.delete(id);
        if (pendingIdsRef.current.size === 0) {
          addLog("Clustering...", "info");
          clusterImages();
          addLog("Scenes assigned.", "success");
        }
      } else if (type === "error") {
        addLog(message ?? "Worker error", "error");
      }
    };

    worker.onerror = () => {
      addLog("AI worker failed to start.", "error");
    };

    worker.postMessage({ type: "init" });

    return () => {
      worker.terminate();
      workerRef.current = null;
      pendingIdsRef.current.clear();
    };
  }, [addLog, setEmbedding, clusterImages]);

  const generateEmbeddings = useCallback(() => {
    const worker = workerRef.current;
    if (!worker) return;

    const images = useStore.getState().images.filter((img) => img.embedding.length === 0);
    if (images.length === 0) return;

    pendingIdsRef.current = new Set(images.map((img) => img.id));
    for (const img of images) {
      addLog(`Processing ${img.file.name}...`, "info");
      worker.postMessage({ type: "embed", id: img.id, url: img.url });
    }
  }, [addLog]);

  return { generateEmbeddings };
}
