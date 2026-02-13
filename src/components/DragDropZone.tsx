"use client";

import { useCallback, useRef } from "react";
import { Upload } from "lucide-react";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/cn";

const ACCEPT = ".jpg,.jpeg,.heic,.png";

export function DragDropZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const addImages = useStore((s) => s.addImages);
  const addLog = useStore((s) => s.addLog);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return;
      const files = Array.from(fileList);
      addLog(`Dropped ${files.length} file(s). Processing...`);
      addImages(files);
    },
    [addImages, addLog]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      e.target.value = "";
    },
    [handleFiles]
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
        accept={ACCEPT}
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
