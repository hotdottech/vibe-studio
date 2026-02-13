"use client";

import { useStore } from "@/store/useStore";
import { cn } from "@/lib/cn";
import type { ImageObject } from "@/types";

function Thumb({
  image,
  isLeft,
  isRight,
  onLeft,
  onRight,
}: {
  image: ImageObject;
  isLeft: boolean;
  isRight: boolean;
  onLeft: () => void;
  onRight: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => (e.shiftKey ? onRight() : onLeft())}
      className={cn(
        "relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500",
        isLeft && "border-emerald-500 ring-1 ring-emerald-500",
        isRight && "border-amber-500 ring-1 ring-amber-500",
        !isLeft && !isRight && "border-transparent hover:border-zinc-600"
      )}
      title="Click = left, Shift+Click = right"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt="" className="h-full w-full object-cover" />
      {(isLeft || isRight) && (
        <span className="absolute right-0.5 top-0.5 rounded bg-black/80 px-1 text-[10px] font-bold text-white">
          {isLeft ? "L" : "R"}
        </span>
      )}
      <span className="absolute bottom-0 left-0 right-0 truncate bg-black/70 px-0.5 py-0.5 text-[10px] text-white">
        {image.meta.model || "Unknown"}
      </span>
    </button>
  );
}

export function ImageStrip() {
  const images = useStore((s) => s.images);
  const selectedLeft = useStore((s) => s.selectedLeft);
  const selectedRight = useStore((s) => s.selectedRight);
  const setSelectedLeft = useStore((s) => s.setSelectedLeft);
  const setSelectedRight = useStore((s) => s.setSelectedRight);

  if (images.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-500">
        Click = left, Shift+Click = right
      </p>
      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <Thumb
            key={img.id}
            image={img}
            isLeft={selectedLeft?.id === img.id}
            isRight={selectedRight?.id === img.id}
            onLeft={() => setSelectedLeft(selectedLeft?.id === img.id ? null : img)}
            onRight={() => setSelectedRight(selectedRight?.id === img.id ? null : img)}
          />
        ))}
      </div>
    </div>
  );
}
