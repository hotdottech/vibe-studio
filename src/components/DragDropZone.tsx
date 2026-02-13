"use client";

import { useCallback, useRef } from "react";
import { Upload } from "lucide-react";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/cn";

/** Brute-force accept: image/* by MIME, or HEIC/HEIF by extension (browsers often get MIME wrong). */
function isAcceptedFile(file: File): boolean {
  const type = (file.type ?? "").toLowerCase();
  const name = (file.name ?? "").toLowerCase();
  return (
    type.startsWith("image/") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

type Props = {
  onAdded?: () => void;
};

export function DragDropZone({ onAdded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const addImages = useStore((s) => s.addImages);
  const addLog = useStore((s) => s.addLog);

  const processFiles = useCallback(
    (fileList: FileList | null, source: string) => {
      if (!fileList?.length) return;
      const files = Array.from(fileList);
      console.log("Files dropped:", files.length, source, files.map((f) => ({ name: f.name, type: f.type || "(empty)" })));

      const accepted: File[] = [];
      const rejected: File[] = [];
      for (const file of files) {
        if (isAcceptedFile(file)) {
          accepted.push(file);
          console.log("Accepted:", file.name, file.type || "(no type)");
        } else {
          rejected.push(file);
          console.log("Rejected:", file.name, file.type || "(no type)");
        }
      }

      if (accepted.length === 0) {
        addLog("No image files to add.", "warn");
        return;
      }
      addLog(`Dropped ${accepted.length} file(s). Processing...`);
      addImages(accepted).then(() => onAdded?.());
    },
    [addImages, addLog, onAdded]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      processFiles(e.dataTransfer.files, "drop");
    },
    [processFiles]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files, "input");
      e.target.value = "";
    },
    [processFiles]
  );

  const onClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-600 bg-zinc-900/50 p-8 transition-colors hover:border-emerald-500/60 hover:bg-zinc-900/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={onInputChange}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Select image files"
      />
      <Upload className="mb-3 h-12 w-12 text-zinc-500" aria-hidden />
      <p className="text-center text-sm font-medium text-zinc-400">
        Drag & drop images here, or click to browse
      </p>
      <p className="mt-1 text-center text-xs text-zinc-500">
        JPG, JPEG, HEIC, PNG — no server upload, all local
      </p>
    </div>
  );
}
