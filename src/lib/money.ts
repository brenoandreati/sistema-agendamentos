const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatMoney(cents: number): string {
  return brl.format(cents / 100);
}

/** Aceita "40", "40,5", "40,50", "1.234,56", "R$ 40,00" e "40.50". Devolve centavos. */
export function parseMoney(input: string | null | undefined): number | null {
  if (input == null) return null;
  const value = input.replace(/R\$|\s/g, "");
  if (!value) return null;
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** 4050 -> "40,50" (para preencher campos de formulário) */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
