# Vibe Compare Studio

Phase 1 prototype: client-side image ingest, EXIF extraction, and side-by-side comparison. No server uploads; all processing is local.

## Tech Stack

- **Next.js 14** (App Router, TypeScript, Tailwind CSS)
- **Zustand** – image & log state
- **@xenova/transformers** – CLIP model (Xenova/clip-vit-base-patch32) in a Web Worker
- **exif-reader** – EXIF metadata
- **lucide-react**, **clsx**, **tailwind-merge** – UI

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
vibe-compare-studio/
├── next.config.mjs          # SharedArrayBuffer headers for WebGPU/workers
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx         # Dashboard
│   │   └── globals.css
│   ├── components/
│   │   ├── DragDropZone.tsx # FileReader API, local state only
│   │   ├── ComparisonView.tsx # Canvas side-by-side
│   │   ├── ImageStrip.tsx   # Thumbnails, L/R selection
│   │   └── ActivityLog.tsx  # Real-time log
│   ├── data/
│   │   └── DeviceMappings.json
│   ├── hooks/
│   │   └── useAIWorker.ts   # Worker lifecycle & log
│   ├── lib/
│   │   ├── cn.ts
│   │   ├── dedupe.ts
│   │   ├── exif.ts
│   │   └── lens.ts
│   ├── store/
│   │   └── useStore.ts      # Zustand (images, logs, selection)
│   ├── types/
│   │   └── index.ts         # ImageObject, ComparisonPair
│   └── worker/
│       └── ai.worker.ts     # CLIP pipeline in Web Worker
```

## Phase 1 Features

- **Drag & drop** – JPG/JPEG/HEIC/PNG; FileReader → Blob URLs; dedupe by name+size+lastModified
- **EXIF** – Make/Model (with DeviceMappings), FocalLength, ISO, Shutter, DateTimeOriginal, watermark detection
- **Comparison view** – Two images side-by-side on HTML5 Canvas
- **AI worker** – Loads Xenova/clip-vit-base-patch32; log shows "Loading AI Model...", "Extracting EXIF...", "Ready"

## Notes

- COOP/COEP headers are set in `next.config.mjs` for SharedArrayBuffer (Transformers.js/WebGPU).
- Run in a secure context (e.g. localhost or HTTPS) for Web Workers and optional WebGPU.
