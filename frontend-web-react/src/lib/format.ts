import type { Fees } from "./api";

// Set this to your currency symbol, e.g. "M" or "E" or "R".
export const CURRENCY = "";

// Mirrors PRACTICAL_SUBJECT_FEE in api-backend/app/constants.py (display only;
// the backend does the real fee calculation).
export const PRACTICAL_SUBJECT_FEE = 250;

// en-US grouping (4,450.00) matches what the payment inputs show
const money = new Intl.NumberFormat("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function formatMoney(value: number) {
	const s = money.format(value);
	return CURRENCY ? `${CURRENCY} ${s}` : s;
}

export type PayState = "paid" | "partial" | "unpaid";

export function payState(fees: Fees): PayState {
	if (fees.balance <= 0) return "paid";
	if (fees.paid > 0) return "partial";
	return "unpaid";
}

export const PAY_STATE_LABEL: Record<PayState, string> = {
	paid: "Paid",
	partial: "Partly paid",
	unpaid: "Not paid",
};

export function percentPaid(fees: Fees) {
	if (fees.total <= 0) return 0;
	return Math.min(100, Math.max(0, (fees.paid / fees.total) * 100));
}
