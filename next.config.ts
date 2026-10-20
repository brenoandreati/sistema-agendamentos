import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O Prisma precisa ficar fora do pacote do Next para o Cloudflare usar a versão certa dele.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  // O driver do Postgres usa um módulo que só é carregado no Cloudflare; o Next não o detecta sozinho.
  outputFileTracingIncludes: { "/*": ["./node_modules/pg-cloudflare/**/*"] },
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
