export type ParseExpenseResult =
  | { readonly ok: true; readonly amount: number; readonly description: string }
  | { readonly ok: false; readonly errorMessage: string };
