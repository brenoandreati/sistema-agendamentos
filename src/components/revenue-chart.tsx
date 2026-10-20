import { formatMoney } from "@/lib/money";

const compact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** Passo "redondo" para as linhas de grade (1, 2, 2,5, 5 × 10ⁿ). */
function niceStep(raw: number) {
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

type Bar = { key: string; label: string; tooltip: string; value: number };

/** Gráfico de colunas de uma série (valor recebido por dia ou por mês), com tooltip no hover e no foco. */
export function RevenueChart({ data, title }: { data: Bar[]; title: string }) {
  const max = Math.max(0, ...data.map((d) => d.value));
  const step = max > 0 ? niceStep(max / 4) : 10_000;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const peak = max > 0 ? data.findIndex((d) => d.value === max) : -1;
  const sparseLabels = data.length > 12;

  return (
    <figure aria-label={title} className="pt-6">
      <div className="flex gap-2">
        <div className="relative h-48 w-14 shrink-0 text-right text-xs text-muted tabular-nums" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0" style={{ bottom: `${(t / top) * 100}%`, transform: "translateY(50%)" }}>
              {compact.format(t / 100)}
            </span>
          ))}
        </div>
        <div className="relative h-48 flex-1">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${(t / top) * 100}%` }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div
                key={d.key}
                tabIndex={0}
                aria-label={`${d.tooltip}: ${formatMoney(d.value)}`}
                className="group relative flex h-full flex-1 items-end justify-center outline-none"
              >
                {i === peak && (
                  <span
                    className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 pb-1 text-xs font-medium whitespace-nowrap text-muted tabular-nums group-hover:invisible group-focus-visible:invisible"
                    style={{ bottom: `${(d.value / top) * 100}%` }}
                  >
                    {compact.format(d.value / 100)}
                  </span>
                )}
                {d.value > 0 && (
                  <div
                    className="w-full max-w-6 rounded-t-[4px] bg-brand transition group-hover:opacity-75 group-focus-visible:opacity-75"
                    style={{ height: `${(d.value / top) * 100}%` }}
                  />
                )}
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 z-20 hidden -translate-x-1/2 rounded-lg bg-fg px-2.5 py-1.5 text-center whitespace-nowrap text-bg shadow-lg group-hover:block group-focus-visible:block"
                  style={{ bottom: `calc(${(d.value / top) * 100}% + 6px)` }}
                >
                  <span className="block text-sm font-semibold tabular-nums">{formatMoney(d.value)}</span>
                  <span className="block text-xs opacity-75">{d.tooltip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-[2px] pl-16 text-xs text-muted" aria-hidden>
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 truncate text-center">
            {!sparseLabels || i === 0 || (i + 1) % 5 === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </figure>
  );
}
