/**
 * AI Worker: runs Transformers.js CLIP pipeline off the main thread.
 * Model: Xenova/clip-vit-base-patch32 (image feature extraction).
 */

import { pipeline } from "@xenova/transformers";

const MODEL_ID = "Xenova/clip-vit-base-patch32";

let extractor: Awaited<ReturnType<typeof pipeline>> | null = null;

async function getExtractor() {
  if (extractor) return extractor;
  extractor = await pipeline("image-feature-extraction", MODEL_ID, {
    quantized: true,
    progress_callback: (data: { status: string }) => {
      self.postMessage({ type: "progress", status: data?.status ?? "Loading..." });
    },
  });
  return extractor;
}

self.onmessage = async (e: MessageEvent<{ type: string; id?: string; url?: string }>) => {
  const { type, id, url } = e.data ?? {};

  try {
    if (type === "init") {
      self.postMessage({ type: "loading", message: "Loading AI Model..." });
      await getExtractor();
      self.postMessage({ type: "ready", message: "AI model ready." });
      return;
    }

    if (type === "embed" && id && url) {
      const ext = await getExtractor();
      type ImageExtractor = (input: string) => Promise<{ data: Float32Array }>;
      const out = await (ext as ImageExtractor)(url);
      const embedding = Array.from(out.data);
      self.postMessage({ type: "embedding", id, embedding });
      return;
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
