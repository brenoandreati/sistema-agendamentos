import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { isExpenseCategory } from "@/lib/expenses";
import { isDateStr, todayStr } from "@/lib/time";
import { ExpenseForm } from "../expense-form";

export const metadata: Metadata = { title: "Nova despesa" };

export default async function NewExpensePage({ searchParams }: PageProps<"/painel/financeiro/despesas/nova">) {
  const { shop } = await requireOwner();
  const { data, categoria } = await searchParams;
  const today = todayStr(shop.timezone);
  const date = isDateStr(data) && data <= today ? data : today;

  return (
    <>
      <PageHeader
        title="Nova despesa"
        description="Dinheiro que saiu: aluguel, produtos, contas, salários. Entra no cálculo do lucro."
        back={{ href: "/painel/financeiro", label: "Financeiro" }}
      />
      <ExpenseForm
        today={today}
        initial={{ description: "", category: isExpenseCategory(categoria) ? categoria : "PRODUCTS", amountCents: null, date, repeat: false }}
      />
    </>
  );
}
