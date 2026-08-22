/**
 * INR display helpers for admin UI.
 */

export function formatCurrency(value: unknown): string {
  const amount = Number(value ?? 0);
  if (Number.isNaN(amount)) return "₹0.00";
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
