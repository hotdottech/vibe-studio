"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { ImageObject } from "@/types";
import { cn } from "@/lib/cn";
import { drawComparison } from "@/lib/canvas";

type Props = {
  left: ImageObject | null;
  right: ImageObject | null;
  className?: string;
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function drawImageCenterCrop(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih);
  const sw = iw * scale;
  const sh = ih * scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

const W_4K = 3840;
const H_4K = 2160;

export function ComparisonView({ left, right, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasRendered, setHasRendered] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [footerBg, setFooterBg] = useState<"white" | "black">("black");

  const drawPreview = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !left || !right) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio : 1);
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);
    canvas.width = w;
    canvas.height = h;
    ctx.scale(dpr, dpr);

    const cw = rect.width;
    const ch = rect.height;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, cw, ch);

    const gutter = 10;
    const leftW = (cw - gutter) / 2;
    const rightX = leftW + gutter;
    const rightW = leftW;

    try {
      const leftImg = await loadImage(left.url);
      ctx.fillRect(0, 0, leftW, ch);
      drawImageCenterCrop(ctx, leftImg, 0, 0, leftW, ch);
    } catch {
      ctx.fillStyle = "#333";
      ctx.fillRect(0, 0, leftW, ch);
    }

    ctx.fillStyle = "#171717";
    ctx.fillRect(leftW, 0, gutter, ch);

    try {
      const rightImg = await loadImage(right.url);
      ctx.fillRect(rightX, 0, rightW, ch);
      drawImageCenterCrop(ctx, rightImg, rightX, 0, rightW, ch);
    } catch {
      ctx.fillStyle = "#333";
      ctx.fillRect(rightX, 0, rightW, ch);
    }
  }, [left, right]);

  useEffect(() => {
    if (hasRendered) return;
    drawPreview();
  }, [hasRendered, drawPreview]);

  useEffect(() => {
    setHasRendered(false);
  }, [left?.id, right?.id]);

  const handleRender = useCallback(async () => {
    if (!left || !right || !canvasRef.current) return;
    setIsRendering(true);
    try {
      const canvas = canvasRef.current;
      canvas.width = W_4K;
      canvas.height = H_4K;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await drawComparison(ctx, left, right, "side-by-side", { footerBg });
      setHasRendered(true);
    } finally {
      setIsRendering(false);
    }
  }, [left, right, footerBg]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width !== W_4K || canvas.height !== H_4K) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vibe-compare-${left?.meta.model ?? "L"}-vs-${right?.meta.model ?? "R"}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
      },
      "image/jpeg",
      0.95
    );
  }, [left?.meta.model, right?.meta.model]);

  const canRender = left && right;
  const canDownload = hasRendered && canvasRef.current?.width === W_4K;

  if (!left && !right) {
    return (
      <div
        className={cn(
          "flex min-h-[320px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-500",
          className
        )}
      >
        Select two images to compare
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleRender}
          disabled={!canRender || isRendering}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {isRendering ? "Rendering…" : "Render"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!canDownload}
          className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
        >
          Download 4K
        </button>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <span>Footer:</span>
          <select
            value={footerBg}
            onChange={(e) => setFooterBg(e.target.value as "white" | "black")}
            className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-zinc-200"
          >
            <option value="black">Black</option>
            <option value="white">White</option>
          </select>
        </label>
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-black">
        <canvas
          ref={canvasRef}
          className="block h-auto w-full max-h-[70vh]"
          style={{
            width: hasRendered ? "100%" : "100%",
            maxWidth: "100%",
            aspectRatio: hasRendered ? `${W_4K}/${H_4K}` : "2/1",
          }}
        />
      </div>
    </div>
  );
}
