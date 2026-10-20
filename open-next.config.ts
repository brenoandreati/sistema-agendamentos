import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// O sistema renderiza as páginas a cada acesso, então não precisa de cache no R2 (que é pago).
// As poucas páginas estáticas (como a inicial) são servidas direto dos arquivos publicados.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
