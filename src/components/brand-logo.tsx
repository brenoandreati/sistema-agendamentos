import { cn } from "./ui";

/**
 * Logo da Arvan. O "A" usa a cor do texto (branco no fundo escuro, azul-marinho no claro)
 * e o "V" é sempre azul, com a perna da esquerda passando na frente da outra.
 */
export function ArvanLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 557 423" className={cn("h-7 w-auto shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id="arvan-v-left" gradientUnits="userSpaceOnUse" x1="232" y1="156" x2="394" y2="423">
          <stop offset="0" stopColor="#0a40ff" />
          <stop offset="1" stopColor="#0028d4" />
        </linearGradient>
        <linearGradient id="arvan-v-right" gradientUnits="userSpaceOnUse" x1="545" y1="160" x2="412" y2="325">
          <stop offset="0" stopColor="#0a52ff" />
          <stop offset="0.55" stopColor="#0846fb" />
          <stop offset="1" stopColor="#0b2ab0" />
        </linearGradient>
      </defs>
      <path fill="currentColor" d="M227.5 0 299 122h-69l-114.7 196H253l41 70H0.5Z" />
      <path fill="url(#arvan-v-right)" d="M476 156h81L434.5 357 394 290Z" />
      <path fill="url(#arvan-v-left)" d="M232 156h80l122.5 201L394 423Z" />
    </svg>
  );
}
