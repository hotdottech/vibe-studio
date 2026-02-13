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
  // Prevent node-specific bindings from being bundled on the client (onnxruntime-node, etc.)
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node": false,
      "@huggingface/transformers": false,
    };
    if (!isServer) {
      config.resolve.fallback = { fs: false, path: false, ...config.resolve.fallback };
    }
    return config;
  },
};

export default nextConfig;
