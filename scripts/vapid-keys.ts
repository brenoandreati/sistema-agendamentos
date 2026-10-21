// Gera as chaves dos avisos no celular (Web Push). Rode uma vez: npm run vapid
// Guarde VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nos segredos do Cloudflare. Trocar as chaves desliga os avisos já ligados.
import { generateVapidKeys } from "../src/lib/web-push";

generateVapidKeys().then((keys) => {
  console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
});
