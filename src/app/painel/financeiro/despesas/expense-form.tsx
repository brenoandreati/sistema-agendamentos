import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Checkbox, Field, Input, Select } from "@/components/ui";
import { EXPENSE_CATEGORY } from "@/lib/expenses";
import { centsToInput } from "@/lib/money";
import { saveExpense } from "../actions";

export type ExpenseFormValues = {
  id?: string;
  description: string;
  category: string;
  amountCents: number | null;
  date: string;
  repeat: boolean;
  /** Dia do mês da despesa fixa já existente (para o texto de ajuda). */
  repeatDay?: number;
};

export function ExpenseForm({ initial, today }: { initial: ExpenseFormValues; today: string }) {
  return (
    <Card className="max-w-xl p-5">
      <ActionForm action={saveExpense} className="flex flex-col gap-4">
        {initial.id && <input type="hidden" name="id" value={initial.id} />}
        <Field label="Descrição">
          <Input name="description" defaultValue={initial.description} required maxLength={100} placeholder="Ex.: Aluguel do salão" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Valor (R$)">
            <Input
              name="amount"
              inputMode="decimal"
              defaultValue={initial.amountCents ? centsToInput(initial.amountCents) : ""}
              required
              placeholder="1.500,00"
            />
          </Field>
          <Field label="Categoria">
            <Select name="category" defaultValue={initial.category}>
              {Object.entries(EXPENSE_CATEGORY).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Data" hint="O dia em que o dinheiro saiu.">
          <Input name="date" type="date" defaultValue={initial.date} max={today} required />
        </Field>
        <Checkbox
          name="repeat"
          defaultChecked={initial.repeat}
          label="Repetir todo mês"
          hint={
            initial.repeatDay
              ? `Lança sozinha todo dia ${initial.repeatDay}. Desmarque para parar de repetir; as já lançadas continuam.`
              : "Para contas fixas, como aluguel e internet: a despesa é lançada sozinha todo mês, no mesmo dia."
          }
        />
        <div>
          <SubmitButton>{initial.id ? "Salvar despesa" : "Registrar despesa"}</SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}
