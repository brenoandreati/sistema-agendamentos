import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayStr, toDateStr } from "@/lib/time";
import { deleteExpense } from "../../actions";
import { ExpenseForm } from "../expense-form";

export const metadata: Metadata = { title: "Despesa" };

export default async function EditExpensePage({ params }: PageProps<"/painel/financeiro/despesas/[id]">) {
  const { id } = await params;
  const { shop } = await requireOwner();
  const expense = await db.expense.findFirst({ where: { id, shopId: shop.id }, include: { recurring: true } });
  if (!expense) notFound();
  const date = toDateStr(expense.date, shop.timezone);
  const repeating = expense.recurring?.active ? expense.recurring : null;

  return (
    <>
      <PageHeader title="Despesa" back={{ href: `/painel/financeiro?periodo=mes&data=${date}`, label: "Financeiro" }} />
      <div className="flex max-w-xl flex-col gap-4">
        <ExpenseForm
          today={todayStr(shop.timezone)}
          initial={{
            id: expense.id,
            description: expense.description,
            category: expense.category,
            amountCents: expense.amountCents,
            date,
            repeat: Boolean(repeating),
            repeatDay: repeating?.dayOfMonth,
          }}
        />
        <ActionForm action={deleteExpense} confirm="Remover esta despesa?">
          <input type="hidden" name="id" value={expense.id} />
          <SubmitButton variant="danger" size="sm" pendingText="Removendo...">
            Remover despesa
          </SubmitButton>
        </ActionForm>
        {repeating && (
          <p className="text-xs text-muted">Remover apaga só a deste mês. Para não lançar mais, desmarque &quot;Repetir todo mês&quot; e salve.</p>
        )}
      </div>
    </>
  );
}
