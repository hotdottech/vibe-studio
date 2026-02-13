/**
 * AI Worker: Intelligence Engine (Spec 2.3).
 * Full pipeline via @xenova/transformers; Xenova/clip-vit-base-patch32.
 * Message types: 'init' (load model), 'embed' (process image → return embedding vector).
 */

import { pipeline } from "@xenova/transformers";

const MODEL_ID = "Xenova/clip-vit-base-patch32";

let extractor: Awaited<ReturnType<typeof pipeline>> | null = null;

async function getExtractor() {
  if (extractor) return extractor;
  extractor = await pipeline("image-feature-extraction", MODEL_ID, {
    quantized: true,
    progress_callback: (data: { status?: string }) => {
      self.postMessage({ type: "progress", message: data?.status ?? "Loading..." });
    },
  });
  return extractor;
}

self.onmessage = async (e: MessageEvent<{ type: string; id?: string; url?: string }>) => {
  const { type, id, url } = e.data ?? {};

  try {
    if (type === "init") {
      self.postMessage({ type: "loading", message: "Loading Model..." });
      await getExtractor();
      self.postMessage({ type: "ready", message: "Model ready." });
      return;
    }

    if (type === "embed" && id && url) {
      const ext = await getExtractor();
      type ImageExtractor = (input: string) => Promise<{ data: Float32Array }>;
      const out = await (ext as ImageExtractor)(url);
      const embedding: number[] = Array.from(out.data);
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
