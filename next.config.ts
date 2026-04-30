import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone bundle для Docker — копируется только то, что нужно для рантайма
  output: "standalone",
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  // @prisma/client и prisma — обязательно external, иначе Next.js бандлит
  // их в webpack и runtime-движок Prisma не находит свои бинарники.
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "docxtemplater",
    "pizzip",
    "docx",
    "pdfjs-dist",
    "imapflow",
    "mailparser",
  ],
  // Доп.гарантия — копируем .prisma/client (сгенерированный клиент с движком)
  // в standalone bundle. Иначе Prisma не сможет загрузить движок в проде.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/.prisma/client/**", "./node_modules/@prisma/client/**"],
  },
  async headers() {
    return [
      // sw.js — НИКОГДА не кешируем, чтобы новый self-destruct SW гарантированно
      // долетел до пользователей со старой версией.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      // manifest.json — на случай ребрендингов/смены иконок
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "no-cache, must-revalidate, max-age=0" },
        ],
      },
      // В dev — вообще никакого кеша на любые ответы
      ...(process.env.NODE_ENV === "development"
        ? [{
            source: "/:path*",
            headers: [
              { key: "Cache-Control", value: "no-store, must-revalidate" },
              { key: "Pragma", value: "no-cache" },
            ],
          }]
        : []),
    ];
  },
};

export default nextConfig;
