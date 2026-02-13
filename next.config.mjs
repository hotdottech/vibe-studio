/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for WebGPU / SharedArrayBuffer (Transformers.js)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
  // Ensure worker and WASM assets are served correctly
  webpack: (config, { isServer }) => {
    if (isServer) return config;
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};

export default nextConfig;
