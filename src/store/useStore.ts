"use client";

import { create } from "zustand";
import type { ImageObject, LogEntry, LogLevel } from "@/types";
import { fileDedupeKey } from "@/lib/dedupe";
import { extractExif } from "@/lib/exif";

type Store = {
  images: ImageObject[];
  logs: LogEntry[];
  selectedLeft: ImageObject | null;
  selectedRight: ImageObject | null;
  addLog: (message: string, level?: LogLevel) => void;
  clearLogs: () => void;
  addImages: (files: File[]) => Promise<void>;
  setEmbedding: (id: string, embedding: number[]) => void;
  setSceneId: (id: string, sceneId: string | null) => void;
  setSelectedLeft: (img: ImageObject | null) => void;
  setSelectedRight: (img: ImageObject | null) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
};

function createLogEntry(message: string, level: LogLevel = "info"): LogEntry {
  return {
    id: crypto.randomUUID(),
    message,
    level,
    timestamp: Date.now(),
  };
}

export const useStore = create<Store>((set, get) => ({
  images: [],
  logs: [],
  selectedLeft: null,
  selectedRight: null,

  addLog(message: string, level: LogLevel = "info") {
    set((state) => ({
      logs: [...state.logs, createLogEntry(message, level)].slice(-100),
    }));
  },

  clearLogs() {
    set({ logs: [] });
  },

  addImages: async (files: File[]) => {
    const { images, addLog } = get();
    const keys = new Set(images.map((img) => fileDedupeKey(img.file)));
    const accepted = [".jpg", ".jpeg", ".heic", ".png"];
    const toAdd = files.filter((file) => {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      if (!accepted.includes(ext)) return false;
      if (keys.has(fileDedupeKey(file))) return false;
      keys.add(fileDedupeKey(file));
      return true;
    });

    if (toAdd.length === 0) {
      addLog("No new images to add (duplicates or unsupported format).", "warn");
      return;
    }

    addLog("Extracting EXIF...", "info");

    const newImages: ImageObject[] = [];

    for (const file of toAdd) {
      try {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        const meta = extractExif(arrayBuffer);
        const url = URL.createObjectURL(file);
        const image: ImageObject = {
          id: crypto.randomUUID(),
          file,
          url,
          embedding: [],
          sceneId: null,
          meta,
        };
        newImages.push(image);
      } catch (e) {
        addLog(`Failed to load ${file.name}: ${String(e)}`, "error");
      }
    }

    set((state) => ({
      images: [...state.images, ...newImages],
    }));
    addLog(`Ready. Added ${newImages.length} image(s).`, "success");
  },

  setEmbedding(id: string, embedding: number[]) {
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, embedding } : img
      ),
    }));
  },

  setSceneId(id: string, sceneId: string | null) {
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, sceneId } : img
      ),
    }));
  },

  setSelectedLeft(img: ImageObject | null) {
    set({ selectedLeft: img });
  },

  setSelectedRight(img: ImageObject | null) {
    set({ selectedRight: img });
  },

  removeImage(id: string) {
    const img = get().images.find((i) => i.id === id);
    if (img) URL.revokeObjectURL(img.url);
    set((state) => ({
      images: state.images.filter((i) => i.id !== id),
      selectedLeft: state.selectedLeft?.id === id ? null : state.selectedLeft,
      selectedRight: state.selectedRight?.id === id ? null : state.selectedRight,
    }));
  },

  clearImages() {
    get().images.forEach((img) => URL.revokeObjectURL(img.url));
    set({
      images: [],
      selectedLeft: null,
      selectedRight: null,
    });
  },
}));

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
