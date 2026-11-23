import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	Button,
	Card,
	cx,
	Empty,
	ErrorNote,
	Input,
	PageHeader,
	PayBadge,
	Spinner,
} from "#/components/ui";
import { api, type PaymentType } from "#/lib/api";
import { formatMoney } from "#/lib/format";
import { useOpenStudent } from "#/lib/open-student";
import { byPaymentTypeQuery } from "#/lib/queries";

const TYPES: { value: PaymentType; label: string; hint: string }[] = [
	{ value: "full", label: "Fully paid", hint: "Balance is zero" },
	{ value: "deposit", label: "Deposit paid", hint: "Paid exactly the deposit" },
	{
		value: "partial",
		label: "Below deposit",
		hint: "Paid less than the deposit",
	},
];

export const Route = createFileRoute("/_app/cards")({
	validateSearch: (s: Record<string, unknown>): { type: PaymentType } => ({
		type: TYPES.some((t) => t.value === s.type)
			? (s.type as PaymentType)
			: "full",
	}),
	component: CardsPage,
});

function CardsPage() {
	const { type } = Route.useSearch();
	const navigate = Route.useNavigate();
	const openStudent = useOpenStudent();
	const students = useQuery(byPaymentTypeQuery(type));
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [q, setQ] = useState("");

	const rows = useMemo(() => {
		const needle = q.trim().toLowerCase();
		return (students.data ?? [])
			.filter((s) => !needle || s.full_name.toLowerCase().includes(needle))
			.sort(
				(a, b) =>
					a.form.localeCompare(b.form) ||
					a.full_name.localeCompare(b.full_name),
			);
	}, [students.data, q]);

	const download = useMutation({ mutationFn: api.downloadCards });

	const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
	const toggleAll = () =>
		setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
	const toggle = (id: string) =>
		setSelected((s) => {
			const n = new Set(s);
			if (n.has(id)) n.delete(id);
			else n.add(id);
			return n;
		});

	const setType = (t: PaymentType) => {
		setSelected(new Set());
		navigate({ search: { type: t } });
	};

	return (
		<>
			<PageHeader
				title="Payment cards"
				subtitle="Choose a group, pick students, and download their cards as one PDF."
				actions={
					<Button
						variant="primary"
						disabled={selected.size === 0 || download.isPending}
						onClick={() => download.mutate([...selected])}
					>
						{download.isPending
							? "Preparing PDF…"
							: `Download ${selected.size || ""} card${selected.size === 1 ? "" : "s"}`}
					</Button>
				}
			/>

			<div
				role="tablist"
				aria-label="Payment group"
				className="mb-4 inline-flex border border-field bg-surface"
			>
				{TYPES.map((t) => (
					<button
						key={t.value}
						type="button"
						role="tab"
						aria-selected={type === t.value}
						title={t.hint}
						onClick={() => setType(t.value)}
						className={cx(
							"-ml-px border-l border-field px-4 py-2 text-sm first:ml-0 first:border-l-0 cursor-pointer",
							type === t.value
								? "bg-ink font-semibold text-surface"
								: "text-ink-2 hover:bg-surface-2",
						)}
					>
						{t.label}
					</button>
				))}
			</div>

			<ErrorNote error={download.error} />

			<Card className="mt-3 overflow-hidden">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
					<Input
						type="search"
						placeholder="Filter by name…"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						className="max-w-xs"
					/>
					<span className="text-sm text-ink-muted">
						{selected.size} of {students.data?.length ?? 0} selected
					</span>
				</div>
				{students.isPending ? (
					<Spinner />
				) : students.error ? (
					<div className="p-4">
						<ErrorNote error={students.error} />
					</div>
				) : rows.length === 0 ? (
					<Empty title="No students in this group" />
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-surface-2 text-left text-xs text-ink-muted">
								<tr>
									<th className="w-10 px-4 py-2.5">
										<input
											type="checkbox"
											aria-label="Select all"
											checked={allSelected}
											onChange={toggleAll}
											className="size-4 accent-[var(--ink)]"
										/>
									</th>
									<th className="px-4 py-2.5 font-medium">Name</th>
									<th className="px-4 py-2.5 font-medium">Form</th>
									<th className="px-4 py-2.5 font-medium">Status</th>
									<th className="px-4 py-2.5 text-right font-medium">Paid</th>
									<th className="px-4 py-2.5 text-right font-medium">
										Balance
									</th>
								</tr>
							</thead>
							<tbody className="tabular-nums">
								{rows.map((s) => (
									<tr
										key={s.id}
										onClick={() => toggle(s.id)}
										className={cx(
											"cursor-pointer border-t border-line hover:bg-surface-2",
											selected.has(s.id) && "bg-accent-soft/50",
										)}
									>
										<td className="px-4 py-2.5">
											<input
												type="checkbox"
												aria-label={`Select ${s.full_name}`}
												checked={selected.has(s.id)}
												onChange={() => toggle(s.id)}
												onClick={(e) => e.stopPropagation()}
												className="size-4 accent-[var(--ink)]"
											/>
										</td>
										<td className="px-4 py-2.5">
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													openStudent(s.id);
												}}
												className="text-left font-medium hover:text-accent cursor-pointer"
											>
												{s.full_name}
											</button>
										</td>
										<td className="px-4 py-2.5">{s.form}</td>
										<td className="px-4 py-2.5">
											<PayBadge fees={s.fees} />
										</td>
										<td className="px-4 py-2.5 text-right">
											{formatMoney(s.fees.paid)}
										</td>
										<td className="px-4 py-2.5 text-right">
											{formatMoney(Math.max(0, s.fees.balance))}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>
		</>
	);
}
