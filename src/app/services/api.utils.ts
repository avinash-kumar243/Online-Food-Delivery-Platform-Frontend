export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const err = error as {
    message?: string;
    error?: { message?: string; error?: string };
  };

  return err?.error?.message || err?.error?.error || err?.message || fallback;
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
