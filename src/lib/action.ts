export type ActionState = { error?: string; message?: string; ok?: boolean };

export const initialState: ActionState = {};

export function fail(error: string): ActionState {
  return { error };
}

export function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function optionalText(form: FormData, name: string): string | null {
  return text(form, name) || null;
}

export function int(form: FormData, name: string): number | null {
  const value = text(form, name);
  if (!/^-?\d+$/.test(value)) return null;
  return Number(value);
}
