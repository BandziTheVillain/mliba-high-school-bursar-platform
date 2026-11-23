import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { api, MONTHS, type Month, type Payment } from "#/lib/api";
import { formatMoney, percentPaid } from "#/lib/format";
import { paymentsQuery, studentQuery } from "#/lib/queries";
import { rememberStudent } from "#/lib/recent";
import { StudentForm } from "./student-form";
import {
	Button,
	Card,
	cx,
	ErrorNote,
	Figure,
	Modal,
	PayBadge,
	Select,
	Spinner,
} from "./ui";

export const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR, THIS_YEAR - 1, THIS_YEAR - 2];

/**
 * One student's account, set out like a statement: what was billed, what was
 * received month by month (editable in place) and the balance running down.
 * Used by the side panel and the full page.
 */
export function StudentDetail({
	studentId,
	year,
	onYearChange,
	variant,
	topBar,
}: {
	studentId: string;
	year: number;
	onYearChange: (y: number) => void;
	variant: "page" | "panel";
	/** Rendered above the account (back link on the page, close/expand in the panel) */
	topBar?: ReactNode;
}) {
	const student = useQuery(studentQuery(studentId));
	const payments = useQuery(paymentsQuery(studentId, year));
	const [editing, setEditing] = useState(false);
	const card = useMutation({
		mutationFn: () =>
			api.downloadCard(studentId, student.data?.full_name ?? "student"),
	});

	useEffect(() => {
		if (student.data) rememberStudent(student.data);
	}, [student.data]);

	const page = variant === "page";
	const pad = "px-5 sm:px-7";

	if (student.isPending)
		return (
			<>
				{topBar}
				<Spinner />
			</>
		);
	if (student.error)
		return (
			<>
				{topBar}
				<div className={cx(pad, "py-5")}>
					<ErrorNote error={student.error} />
				</div>
			</>
		);

	const s = student.data;
	const byMonth = new Map<Month, Payment>(
		(payments.data ?? []).map((p) => [p.month, p]),
	);
	const yearTotal = (payments.data ?? []).reduce((t, p) => t + p.amount, 0);
	const count = (payments.data ?? []).filter((p) => p.amount > 0).length;
	const due = Math.max(0, s.fees.balance);

	// Running balance for the chosen year: start from what was still owed after
	// any other years' payments, then take each month off in turn.
	const otherYears = s.fees.paid - yearTotal;
	let running = s.fees.total - otherYears;
	const lastPaidIdx = MONTHS.reduce(
		(last, m, i) => ((byMonth.get(m)?.amount ?? 0) > 0 ? i : last),
		-1,
	);
	const showUntil = Math.max(
		lastPaidIdx,
		year === THIS_YEAR ? new Date().getMonth() : year < THIS_YEAR ? 11 : -1,
	);
	const balances = MONTHS.map((m, i) => {
		running -= byMonth.get(m)?.amount ?? 0;
		return i <= showUntil ? running : null;
	});

	const body = (
		<>
			{/* Identity + actions */}
			<div
				className={cx(
					pad,
					"flex flex-wrap items-start justify-between gap-4 pt-5",
				)}
			>
				<div className="min-w-0">
					<h2 className={cx("font-semibold", page ? "text-3xl" : "text-2xl")}>
						{s.full_name}
					</h2>
					<div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-muted">
						<span>
							Form <b className="font-mono font-semibold text-ink">{s.form}</b>
						</span>
						<span aria-hidden>·</span>
						<span>{s.ovc_status}</span>
						<span aria-hidden>·</span>
						<span>
							{s.practical_subjects_count} practical subject
							{s.practical_subjects_count === 1 ? "" : "s"}
						</span>
						<span className="ml-1.5">
							<PayBadge fees={s.fees} />
						</span>
					</div>
				</div>
				<div className="no-print flex flex-wrap gap-1.5">
					<Button size="sm" onClick={() => setEditing(true)}>
						Edit
					</Button>
					{page && (
						<Button size="sm" onClick={() => window.print()}>
							Print statement
						</Button>
					)}
					<Button
						size="sm"
						variant="solid"
						onClick={() => card.mutate()}
						disabled={card.isPending}
					>
						{card.isPending ? "Preparing…" : "Card PDF"}
					</Button>
				</div>
			</div>
			{card.error && (
				<div className={cx(pad, "mt-3")}>
					<ErrorNote error={card.error} />
				</div>
			)}

			{/* Account summary */}
			<div className={pad}>
				<div className="mt-5 grid grid-cols-3 border-t-[3px] border-b border-double border-t-ink border-b-ink">
					<Figure
						label="Billed"
						value={formatMoney(s.fees.total)}
						sub={
							s.practical_subjects_count > 0
								? `incl. ${s.practical_subjects_count} practical${s.practical_subjects_count === 1 ? "" : "s"}`
								: `${s.ovc_status} fee`
						}
						className="py-3 pr-3"
					/>
					<Figure
						label="Received"
						value={formatMoney(s.fees.paid)}
						sub={`${Math.round(percentPaid(s.fees))}% collected`}
						className="border-l border-line py-3 px-4"
					/>
					<Figure
						label="Due"
						value={formatMoney(due)}
						strong
						tone={due > 0 ? "due" : undefined}
						sub={due > 0 ? "outstanding" : "settled"}
						className="border-l border-line py-3 pl-4 [&>div:nth-child(2)]:text-[22px]"
					/>
				</div>
			</div>

			{/* Payments received */}
			<div
				className={cx(
					pad,
					"mt-6 flex flex-wrap items-center justify-between gap-3",
				)}
			>
				<div>
					<h3 className="text-[15px] font-semibold">Payments received</h3>
					<p className="text-xs text-ink-faint">
						{count} payment{count === 1 ? "" : "s"} in {year} ·{" "}
						<span className="font-mono">{formatMoney(yearTotal)}</span>
					</p>
				</div>
				{/* biome-ignore lint/a11y/noLabelWithoutControl: wraps the Select component */}
				<label className="no-print flex items-center gap-2 text-sm text-ink-muted">
					Year
					<Select
						value={year}
						onChange={(e) => onYearChange(Number(e.target.value))}
						className="h-8! w-24 font-mono"
					>
						{YEARS.map((y) => (
							<option key={y} value={y}>
								{y}
							</option>
						))}
					</Select>
				</label>
			</div>

			<div className={cx(pad, "mt-2 pb-6")}>
				{payments.isPending ? (
					<Spinner />
				) : payments.error ? (
					<ErrorNote error={payments.error} />
				) : (
					<table className="w-full border-collapse text-sm">
						<thead>
							<tr className="h-8 text-[11px] tracking-[0.1em] text-ink-muted uppercase">
								<th
									scope="col"
									className="border-b border-ink text-left font-medium"
								>
									Month
								</th>
								<th
									scope="col"
									className="w-40 border-b border-ink text-right font-medium"
								>
									Amount
								</th>
								<th
									scope="col"
									className="w-36 border-b border-ink text-right font-medium"
								>
									Balance due
								</th>
								<th scope="col" className="w-20 border-b border-ink">
									<span className="sr-only">Save state</span>
								</th>
							</tr>
						</thead>
						<tbody className="font-mono tabular-nums">
							{MONTHS.map((m, i) => (
								<MonthRow
									key={`${year}-${m}`}
									studentId={studentId}
									year={year}
									month={m}
									amount={byMonth.get(m)?.amount ?? 0}
									balance={balances[i]}
								/>
							))}
						</tbody>
					</table>
				)}
				<p className="no-print mt-2 text-xs text-ink-faint">
					Type an amount and press Enter or Tab to record it · Esc undoes
				</p>
			</div>
		</>
	);

	return (
		<>
			{topBar}
			{page ? <Card className="pb-1">{body}</Card> : body}
			<EditStudentModal
				open={editing}
				onClose={() => setEditing(false)}
				studentId={studentId}
				initial={{
					full_name: s.full_name,
					form: s.form,
					ovc_status: s.ovc_status,
					practical_subjects_count: s.practical_subjects_count,
				}}
			/>
		</>
	);
}

function MonthRow({
	studentId,
	year,
	month,
	amount,
	balance,
}: {
	studentId: string;
	year: number;
	month: Month;
	amount: number;
	balance: number | null;
}) {
	const qc = useQueryClient();
	const [draft, setDraft] = useState(amount ? String(amount) : "");
	const inputRef = useRef<HTMLInputElement>(null);
	// Pick up server changes (e.g. after refetch) unless the user is typing here
	useEffect(() => {
		if (document.activeElement !== inputRef.current)
			setDraft(amount ? String(amount) : "");
	}, [amount]);
	const save = useMutation({
		mutationFn: (value: number) =>
			api.setPayment(studentId, { month, year, amount: value }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
	});

	const commit = () => {
		const value = draft.trim() === "" ? 0 : Number(draft);
		if (!Number.isFinite(value) || value < 0) {
			setDraft(amount ? String(amount) : "");
			return;
		}
		if (value !== amount) save.mutate(value);
	};

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") e.currentTarget.blur();
		if (e.key === "Escape") {
			// Undo the edit without also closing the side panel
			e.preventDefault();
			e.stopPropagation();
			setDraft(amount ? String(amount) : "");
			e.currentTarget.blur();
		}
	};

	const id = `pay-${studentId}-${month}`;
	return (
		<tr className="h-10">
			<td className="border-b border-line font-sans">
				<label htmlFor={id}>{month}</label>
			</td>
			<td className="border-b border-line py-1 text-right">
				<input
					ref={inputRef}
					id={id}
					type="number"
					inputMode="decimal"
					min={0}
					step="0.01"
					placeholder="—"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onBlur={commit}
					onKeyDown={onKeyDown}
					onFocus={(e) => e.currentTarget.select()}
					className={cx(
						"h-8 w-36 border px-2 text-right font-mono tabular-nums placeholder:text-ink-faint focus:outline-2 focus:-outline-offset-1 focus:outline-ink",
						save.isError
							? "border-critical"
							: amount > 0
								? "border-field bg-surface font-semibold"
								: "border-line bg-surface-2",
					)}
				/>
			</td>
			<td
				className={cx(
					"border-b border-line text-right",
					balance !== null && balance <= 0 ? "text-ink-faint" : "text-ink",
				)}
			>
				{balance === null ? "" : formatMoney(Math.max(0, balance))}
			</td>
			<td
				className="border-b border-line text-right font-sans text-xs"
				aria-live="polite"
			>
				{save.isPending ? (
					<span className="text-ink-muted">saving…</span>
				) : save.isError ? (
					<span className="text-critical-text" title={save.error.message}>
						⚠ not saved
					</span>
				) : save.isSuccess ? (
					<span className="text-good-text">✓ saved</span>
				) : null}
			</td>
		</tr>
	);
}

function EditStudentModal({
	open,
	onClose,
	studentId,
	initial,
}: {
	open: boolean;
	onClose: () => void;
	studentId: string;
	initial: Parameters<typeof api.editStudent>[1];
}) {
	const qc = useQueryClient();
	const edit = useMutation({
		mutationFn: (v: Parameters<typeof api.editStudent>[1]) =>
			api.editStudent(studentId, v),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["students"] });
			onClose();
		},
	});
	return (
		<Modal
			open={open}
			onClose={() => {
				edit.reset();
				onClose();
			}}
			title="Edit student"
		>
			<StudentForm
				initial={initial}
				submitLabel="Save changes"
				pending={edit.isPending}
				error={edit.error}
				onSubmit={(v) => edit.mutate(v)}
				onCancel={onClose}
			/>
		</Modal>
	);
}
