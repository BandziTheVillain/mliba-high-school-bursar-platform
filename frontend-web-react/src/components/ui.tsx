// Shared UI in the "Ledger" look (design K): square corners, paper sheets
// lifted off a grey desk, IBM Plex Sans + Mono, outlined status stamps.
import {
	type ButtonHTMLAttributes,
	type InputHTMLAttributes,
	type ReactNode,
	type SelectHTMLAttributes,
	useEffect,
	useRef,
} from "react";
import type { Fees } from "#/lib/api";
import {
	formatMoney,
	type PayState,
	payState,
	percentPaid,
} from "#/lib/format";

export function cx(...c: (string | false | null | undefined)[]) {
	return c.filter(Boolean).join(" ");
}

/* ---------- buttons & fields ---------- */

type Variant = "primary" | "solid" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
	// The one main action on a screen (New entry, Sign in): crest red
	primary:
		"bg-accent text-accent-ink border border-accent hover:bg-accent-hover",
	// Strong but not the main action (Card PDF, Import): ink black
	solid: "bg-ink text-surface border border-ink hover:opacity-90",
	secondary: "bg-surface text-ink border border-field hover:bg-surface-2",
	ghost: "text-ink-2 border border-transparent hover:bg-surface-2",
	danger: "text-critical-text border border-transparent hover:bg-critical-soft",
};

export function Button({
	variant = "secondary",
	size = "md",
	className,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: Variant;
	size?: "sm" | "md";
}) {
	return (
		<button
			type="button"
			className={cx(
				"inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer",
				size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-9 px-3.5 text-sm",
				variants[variant],
				className,
			)}
			{...props}
		/>
	);
}

// Full width unless the caller sets its own width (w-32, max-w-xs, flex-1 ...)
const hasWidth = (c?: string) =>
	/(^|\s)(w-|max-w-|flex-1|basis-)/.test(c ?? "");
const fieldBase =
	"h-9 border border-field bg-surface px-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:-outline-offset-1 focus:outline-ink";

export function Input({
	className,
	...props
}: InputHTMLAttributes<HTMLInputElement>) {
	return (
		<input
			className={cx(fieldBase, !hasWidth(className) && "w-full", className)}
			{...props}
		/>
	);
}

export function Select({
	className,
	children,
	...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select
			className={cx(
				fieldBase,
				"pr-7",
				!hasWidth(className) && "w-full",
				className,
			)}
			{...props}
		>
			{children}
		</select>
	);
}

export function Field({
	label,
	children,
	hint,
}: {
	label: string;
	children: ReactNode;
	hint?: string;
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: control is passed as children
		<label className="block space-y-1.5">
			<span className="text-sm font-medium text-ink-2">{label}</span>
			{children}
			{hint && <span className="block text-xs text-ink-muted">{hint}</span>}
		</label>
	);
}

/* ---------- surfaces ---------- */

/** A sheet of paper on the desk: square, white, soft lift shadow. */
export function Card({
	className,
	children,
}: {
	className?: string;
	children: ReactNode;
}) {
	return <div className={cx("sheet bg-surface", className)}>{children}</div>;
}

/** Small spaced-out caps label above a heading ("STUDENT FEE REGISTER"). */
export function Kicker({ children }: { children: ReactNode }) {
	return (
		<div className="text-xs tracking-[0.15em] text-ink-muted uppercase">
			{children}
		</div>
	);
}

/** Letterhead: kicker + title on the left, figures or actions on the right, double rule below. */
export function Letterhead({
	kicker,
	title,
	aside,
	className,
}: {
	kicker?: ReactNode;
	title: ReactNode;
	aside?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cx(
				"flex flex-wrap items-end justify-between gap-4 border-b-[3px] border-double border-ink px-5 pt-5 pb-4 sm:px-8",
				className,
			)}
		>
			<div className="min-w-0">
				{kicker && <Kicker>{kicker}</Kicker>}
				<h1 className="mt-0.5 text-2xl font-semibold">{title}</h1>
			</div>
			{aside}
		</div>
	);
}

/** A labelled money figure, for letterheads and summaries. */
export function Figure({
	label,
	value,
	strong,
	tone,
	sub,
	className,
}: {
	label: string;
	value: ReactNode;
	strong?: boolean;
	tone?: "due";
	sub?: ReactNode;
	className?: string;
}) {
	return (
		<div className={className}>
			<div
				className={cx(
					"text-xs",
					strong ? "font-semibold text-ink" : "text-ink-muted",
				)}
			>
				{label}
			</div>
			<div
				className={cx(
					"font-mono text-base tabular-nums sm:text-lg",
					strong ? "font-semibold" : "font-medium",
					tone === "due" && "text-accent",
				)}
			>
				{value}
			</div>
			{sub && <div className="text-xs text-ink-faint">{sub}</div>}
		</div>
	);
}

export function PageHeader({
	title,
	subtitle,
	actions,
}: {
	title: ReactNode;
	subtitle?: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<div className="mb-5 flex flex-wrap items-end justify-between gap-3">
			<div className="min-w-0">
				<h1 className="text-2xl font-semibold">{title}</h1>
				{subtitle && (
					<p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>
				)}
			</div>
			{actions && <div className="flex flex-wrap gap-2">{actions}</div>}
		</div>
	);
}

export function ErrorNote({ error }: { error: unknown }) {
	if (!error) return null;
	return (
		<p
			role="alert"
			className="border-l-[3px] border-critical bg-critical-soft px-3 py-2 text-sm text-critical-text"
		>
			{error instanceof Error ? error.message : String(error)}
		</p>
	);
}

export function Spinner() {
	return (
		<div className="flex justify-center p-10">
			<div className="size-5 animate-spin rounded-full border-2 border-line border-t-ink" />
		</div>
	);
}

export function Empty({
	title,
	children,
}: {
	title: string;
	children?: ReactNode;
}) {
	return (
		<div className="px-6 py-14 text-center">
			<p className="font-medium">{title}</p>
			{children && (
				<div className="mt-1 text-sm text-ink-muted">{children}</div>
			)}
		</div>
	);
}

/* ---------- overlays ---------- */

function useDialog(open: boolean) {
	const ref = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		const d = ref.current;
		if (!d) return;
		if (open && !d.open) d.showModal();
		if (!open && d.open) d.close();
	}, [open]);
	return ref;
}

/** Native <dialog> modal: focus trap, Esc to close and backdrop for free. */
export function Modal({
	open,
	onClose,
	title,
	children,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
}) {
	const ref = useDialog(open);
	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click only; Esc is handled natively by <dialog>
		<dialog
			ref={ref}
			onClose={onClose}
			onClick={(e) => e.target === ref.current && onClose()}
			className="m-auto w-[min(30rem,calc(100vw-2rem))] border-t-[3px] border-accent bg-surface p-0 text-ink shadow-2xl"
		>
			{open && (
				<div className="p-6">
					<div className="mb-5 flex items-center justify-between">
						<h2 className="text-lg font-semibold">{title}</h2>
						<button
							type="button"
							onClick={onClose}
							aria-label="Close"
							className="px-1.5 text-lg text-ink-muted hover:text-ink cursor-pointer"
						>
							✕
						</button>
					</div>
					{children}
				</div>
			)}
		</dialog>
	);
}

/** Right-hand side panel built on native <dialog>: focus trap, Esc and backdrop close. */
export function Drawer({
	open,
	onClose,
	label,
	children,
}: {
	open: boolean;
	onClose: () => void;
	label: string;
	children: ReactNode;
}) {
	const ref = useDialog(open);
	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click only; Esc is handled natively by <dialog>
		<dialog
			ref={ref}
			aria-label={label}
			onClose={onClose}
			onClick={(e) => e.target === ref.current && onClose()}
			className="drawer m-0 ml-auto h-dvh max-h-none w-[min(42rem,100vw)] max-w-none bg-surface p-0 text-ink"
		>
			{open && children}
		</dialog>
	);
}

/* ---------- payment status ---------- */

const STAMP: Record<PayState, { label: string; cls: string; bar: string }> = {
	paid: {
		label: "Paid",
		cls: "border-good-text text-good-text",
		bar: "bg-good",
	},
	partial: {
		label: "Part",
		cls: "border-warning-text text-warning-text",
		bar: "bg-warning",
	},
	unpaid: {
		label: "Unpaid",
		cls: "border-none-text text-none-text",
		bar: "bg-none",
	},
};

/** Outlined rubber-stamp label. The word carries the meaning; colour only supports it. */
export function PayBadge({ fees }: { fees: Fees }) {
	const s = STAMP[payState(fees)];
	return (
		<span
			className={cx(
				"inline-block border-[1.5px] px-2 py-px text-[11px] leading-4 font-semibold tracking-[0.12em] whitespace-nowrap uppercase",
				s.cls,
			)}
		>
			{s.label}
		</span>
	);
}

/** Square bar of paid / total. */
export function PayMeter({
	fees,
	className,
}: {
	fees: Fees;
	className?: string;
}) {
	const pct = percentPaid(fees);
	return (
		// biome-ignore lint/a11y/useSemanticElements: native <meter> can't be styled consistently across browsers
		<div
			role="meter"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(pct)}
			aria-label={`${Math.round(pct)}% paid`}
			title={`${formatMoney(fees.paid)} of ${formatMoney(fees.total)} (${Math.round(pct)}%)`}
			className={cx("h-2 w-full overflow-hidden bg-track", className)}
		>
			<div
				className={cx("h-full", STAMP[payState(fees)].bar)}
				style={{ width: `${pct}%` }}
			/>
		</div>
	);
}

export function StatTile({
	label,
	value,
	sub,
}: {
	label: string;
	value: ReactNode;
	sub?: ReactNode;
}) {
	return (
		<Card className="p-4">
			<p className="text-xs text-ink-muted">{label}</p>
			<p className="mt-1 font-mono text-xl font-medium tabular-nums">{value}</p>
			{sub && <p className="mt-1 text-xs text-ink-muted">{sub}</p>}
		</Card>
	);
}

/* ---------- pagination ---------- */

/** Page numbers to show: always first/last, a window around the current page, gaps as null. */
function pageList(page: number, pages: number): (number | null)[] {
	if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
	const set = new Set([1, pages, page - 1, page, page + 1]);
	const nums = [...set]
		.filter((n) => n >= 1 && n <= pages)
		.sort((a, b) => a - b);
	const out: (number | null)[] = [];
	for (const n of nums) {
		const prev = out[out.length - 1];
		if (typeof prev === "number" && n - prev > 1) out.push(null);
		out.push(n);
	}
	return out;
}

const pageBtn =
	"min-w-9 h-9 -ml-px first:ml-0 border border-line-strong bg-surface px-2 font-mono text-sm tabular-nums hover:bg-surface-2 disabled:text-ink-faint disabled:hover:bg-surface cursor-pointer disabled:cursor-default";

export function Pagination({
	page,
	pages,
	total,
	size,
	sizes = [12, 25, 50, 100],
	noun = "students",
	onPage,
	onSize,
}: {
	page: number;
	pages: number;
	total: number;
	size: number;
	sizes?: number[];
	noun?: string;
	onPage: (p: number) => void;
	onSize: (s: number) => void;
}) {
	const from = total === 0 ? 0 : (page - 1) * size + 1;
	const to = Math.min(total, page * size);
	return (
		<nav
			aria-label="Pages"
			className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line-strong bg-surface-2 px-5 py-3 text-sm sm:px-8"
		>
			<span className="text-ink-muted">
				Showing{" "}
				<b className="font-mono font-semibold text-ink tabular-nums">
					{from}–{to}
				</b>{" "}
				of{" "}
				<b className="font-mono font-semibold text-ink tabular-nums">{total}</b>{" "}
				{noun}
			</span>
			{/* biome-ignore lint/a11y/noLabelWithoutControl: wraps the Select component */}
			<label className="flex items-center gap-2 text-ink-muted">
				Rows per page
				<Select
					value={size}
					onChange={(e) => onSize(Number(e.target.value))}
					className="h-8! w-20 font-mono"
				>
					{sizes.map((s) => (
						<option key={s} value={s}>
							{s}
						</option>
					))}
				</Select>
			</label>
			<span className="flex-1" />
			<div className="flex">
				<button
					type="button"
					className={pageBtn}
					aria-label="First page"
					disabled={page <= 1}
					onClick={() => onPage(1)}
				>
					«
				</button>
				<button
					type="button"
					className={pageBtn}
					aria-label="Previous page"
					disabled={page <= 1}
					onClick={() => onPage(page - 1)}
				>
					‹
				</button>
				{pageList(page, pages).map((n, i) =>
					n === null ? (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: gaps have no identity
							key={`gap-${i}`}
							className={cx(
								pageBtn,
								"inline-flex items-center justify-center text-ink-faint",
							)}
						>
							…
						</span>
					) : (
						<button
							key={n}
							type="button"
							aria-label={`Page ${n}`}
							aria-current={n === page ? "page" : undefined}
							onClick={() => onPage(n)}
							className={cx(
								pageBtn,
								n === page &&
									"relative z-10 border-ink bg-ink font-semibold text-surface hover:bg-ink",
							)}
						>
							{n}
						</button>
					),
				)}
				<button
					type="button"
					className={pageBtn}
					aria-label="Next page"
					disabled={page >= pages}
					onClick={() => onPage(page + 1)}
				>
					›
				</button>
				<button
					type="button"
					className={pageBtn}
					aria-label="Last page"
					disabled={page >= pages}
					onClick={() => onPage(pages)}
				>
					»
				</button>
			</div>
			<form
				className="flex items-center gap-2 text-ink-muted"
				onSubmit={(e) => {
					e.preventDefault();
					const input = e.currentTarget.elements.namedItem(
						"goto",
					) as HTMLInputElement;
					const n = Math.trunc(Number(input.value));
					if (n >= 1 && n <= pages) onPage(n);
					input.value = "";
				}}
			>
				<label htmlFor="goto-page">Go to</label>
				<Input
					id="goto-page"
					name="goto"
					inputMode="numeric"
					placeholder={String(page)}
					className="h-8! w-12 text-center font-mono"
				/>
			</form>
		</nav>
	);
}
