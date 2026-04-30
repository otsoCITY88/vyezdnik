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
