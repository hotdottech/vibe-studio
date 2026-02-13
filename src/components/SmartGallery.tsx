"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/cn";
import type { ImageObject } from "@/types";
import { Layers, GitCompare } from "lucide-react";

function Thumb({
  image,
  isLeft,
  isRight,
  onSelectLeft,
  onSelectRight,
}: {
  image: ImageObject;
  isLeft: boolean;
  isRight: boolean;
  onSelectLeft: () => void;
  onSelectRight: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => (e.shiftKey ? onSelectRight() : onSelectLeft())}
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

type SceneGroup = { label: string; sceneId: string | null; images: ImageObject[] };

export function SmartGallery() {
  const images = useStore((s) => s.images);
  const selectedLeft = useStore((s) => s.selectedLeft);
  const selectedRight = useStore((s) => s.selectedRight);
  const setSelectedLeft = useStore((s) => s.setSelectedLeft);
  const setSelectedRight = useStore((s) => s.setSelectedRight);

  const groups = useMemo((): SceneGroup[] => {
    const byScene = new Map<string | null, ImageObject[]>();
    const sceneOrder: (string | null)[] = [];

    for (const img of images) {
      const sid = img.sceneId ?? null;
      if (!byScene.has(sid)) {
        byScene.set(sid, []);
        sceneOrder.push(sid);
      }
      byScene.get(sid)!.push(img);
    }
    sceneOrder.sort((a, b) => (a === null ? 1 : b === null ? -1 : 0));
    const nonNullOrder = sceneOrder.filter((s) => s !== null);

    return sceneOrder.map((sid) => {
      const imgs = byScene.get(sid)!;
      const label =
        sid === null ? "Unsorted" : `Scene ${nonNullOrder.indexOf(sid) + 1}`;
      return { label, sceneId: sid, images: imgs };
    });
  }, [images]);

  if (images.length === 0) return null;

  return (
    <div className="space-y-6">
      <p className="text-xs font-medium text-zinc-500">
        Click = left, Shift+Click = right · Use &quot;Compare Pair&quot; to load first two of a scene
      </p>
      <div className="grid gap-6">
        {groups.map(({ label, sceneId, images: groupImages }) => (
          <section key={sceneId ?? "unsorted"} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Layers className="h-4 w-4 text-zinc-500" />
                {label}
                <span className="text-zinc-500">({groupImages.length})</span>
              </h3>
              {groupImages.length >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLeft(groupImages[0]!);
                    setSelectedRight(groupImages[1]!);
                  }}
                  className="flex items-center gap-1.5 rounded-md bg-emerald-600/80 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  Compare Pair
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {groupImages.map((img) => (
                <Thumb
                  key={img.id}
                  image={img}
                  isLeft={selectedLeft?.id === img.id}
                  isRight={selectedRight?.id === img.id}
                  onSelectLeft={() => setSelectedLeft(selectedLeft?.id === img.id ? null : img)}
                  onSelectRight={() => setSelectedRight(selectedRight?.id === img.id ? null : img)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
