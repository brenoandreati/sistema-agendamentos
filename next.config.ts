import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O Prisma precisa ficar fora do pacote do Next para o Cloudflare usar a versão certa dele.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  // O driver do Postgres usa um módulo que só é carregado no Cloudflare; o Next não o detecta sozinho.
  outputFileTracingIncludes: { "/*": ["./node_modules/pg-cloudflare/**/*"] },
  // Endereços que as pessoas digitam com acento ou de forma curta.
  async redirects() {
    return [
      { source: "/demonstra%C3%A7%C3%A3o", destination: "/demonstracao", permanent: true },
      { source: "/demo", destination: "/demonstracao", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
