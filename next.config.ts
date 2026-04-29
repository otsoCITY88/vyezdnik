import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone bundle для Docker — копируется только то, что нужно для рантайма
  output: "standalone",
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  serverExternalPackages: ["docxtemplater", "pizzip", "docx", "pdfjs-dist", "imapflow", "mailparser"],
  async headers() {
    // в dev — никакого кеша, чтобы изменения сразу долетали
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
