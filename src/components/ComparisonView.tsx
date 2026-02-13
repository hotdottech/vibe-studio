"use client";

import { useRef, useEffect, useCallback } from "react";
import type { ImageObject } from "@/types";
import { cn } from "@/lib/cn";

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

export function ComparisonView({ left, right, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

    if (left) {
      try {
        const img = await loadImage(left.url);
        ctx.fillRect(0, 0, leftW, ch);
        drawImageCenterCrop(ctx, img, 0, 0, leftW, ch);
      } catch {
        ctx.fillStyle = "#333";
        ctx.fillRect(0, 0, leftW, ch);
      }
    }

    ctx.fillStyle = "#171717";
    ctx.fillRect(leftW, 0, gutter, ch);

    if (right) {
      try {
        const img = await loadImage(right.url);
        ctx.fillRect(rightX, 0, rightW, ch);
        drawImageCenterCrop(ctx, img, rightX, 0, rightW, ch);
      } catch {
        ctx.fillStyle = "#333";
        ctx.fillRect(rightX, 0, rightW, ch);
      }
    }
  }, [left, right]);

  useEffect(() => {
    draw();
  }, [draw]);

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
    <div className={cn("overflow-hidden rounded-lg border border-zinc-800 bg-black", className)}>
      <canvas
        ref={canvasRef}
        className="block h-auto w-full max-h-[70vh]"
        style={{ width: "100%", aspectRatio: "2/1" }}
      />
    </div>
  );
}
