import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useMemo } from "react";
import {
	Button,
	Card,
	Empty,
	ErrorNote,
	Figure,
	Letterhead,
	Spinner,
} from "#/components/ui";
import { FORMS, MONTHS, OVC_STATUSES, type Student } from "#/lib/api";
import { formatMoney, payState } from "#/lib/format";
import { monthlyQuery, studentsQuery, tasksQuery } from "#/lib/queries";

const THIS_YEAR = new Date().getFullYear();

export const Route = createFileRoute("/_app/overview")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.prefetchQuery(studentsQuery({})),
			context.queryClient.prefetchQuery(monthlyQuery(THIS_YEAR)),
		]),
	component: Overview,
});

type Group = {
	key: string;
	n: number;
	billed: number;
	received: number;
	due: number;
};

function groupBy(
	list: Student[],
	key: (s: Student) => string,
	order: readonly string[],
) {
	const map = new Map<string, Group>();
	for (const s of list) {
		const k = key(s);
		const g = map.get(k) ?? { key: k, n: 0, billed: 0, received: 0, due: 0 };
		g.n++;
		g.billed += s.fees.total;
		g.received += s.fees.paid;
		g.due += Math.max(0, s.fees.balance);
		map.set(k, g);
	}
	const rank = (k: string) => {
		const i = order.indexOf(k);
		return i === -1 ? order.length : i;
	};
	return [...map.values()].sort((a, b) => rank(a.key) - rank(b.key));
}

function Overview() {
	const students = useQuery(studentsQuery({}));
	const monthly = useQuery(monthlyQuery(THIS_YEAR));
	const tasks = useQuery(tasksQuery);

	const stats = useMemo(() => {
		const list = students.data ?? [];
		let billed = 0;
		let received = 0;
		let due = 0;
		let full = 0;
		for (const s of list) {
			billed += s.fees.total;
			received += s.fees.paid;
			due += Math.max(0, s.fees.balance);
			if (payState(s.fees) === "paid") full++;
		}
		return {
			n: list.length,
			billed,
			received,
			due,
			full,
			byForm: groupBy(list, (s) => s.form, FORMS),
			byStatus: groupBy(list, (s) => s.ovc_status, OVC_STATUSES),
		};
	}, [students.data]);

	if (students.isPending) return <Spinner />;
	if (students.error) return <ErrorNote error={students.error} />;

	const pending = (tasks.data ?? []).filter((t) => t.status === "Pending");

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
			{/* Collection report */}
			<Card className="min-w-0">
				<Letterhead
					kicker="Collection report"
					title="All students to date"
					aside={
						<Button
							size="sm"
							className="no-print"
							onClick={() => window.print()}
						>
							Print report
						</Button>
					}
				/>
				{stats.n === 0 ? (
					<Empty title="No students yet">
						<Link to="/students" className="text-link hover:underline">
							Add students in the fee register
						</Link>{" "}
						to see the report.
					</Empty>
				) : (
					<>
						<div className="grid grid-cols-2 border-b border-ink sm:grid-cols-4">
							<Figure
								label="Billed"
								value={formatMoney(stats.billed)}
								className="px-5 py-3.5 sm:px-8"
							/>
							<Figure
								label="Received"
								value={formatMoney(stats.received)}
								className="border-l border-line px-5 py-3.5"
							/>
							<Figure
								label="Due"
								value={formatMoney(stats.due)}
								strong
								tone="due"
								className="border-t border-line px-5 py-3.5 sm:border-t-0 sm:border-l sm:px-5"
							/>
							<Figure
								label="Fully paid"
								value={
									<>
										{stats.full}{" "}
										<span className="text-sm text-ink-faint">/ {stats.n}</span>
									</>
								}
								className="border-t border-l border-line px-5 py-3.5 sm:border-t-0"
							/>
						</div>
						<Breakdown
							caption="By form"
							first="Form"
							rows={stats.byForm}
							link="form"
						/>
						<Breakdown
							caption="By OVC status"
							first="Status"
							rows={stats.byStatus}
							link="ovc_status"
						/>
					</>
				)}
			</Card>

			<div className="flex min-w-0 flex-col gap-6">
				<MonthlyChart data={monthly.data} loading={monthly.isPending} />

				<Card>
					<div className="flex items-center justify-between border-b border-ink px-5 py-3.5">
						<h2 className="text-[15px] font-semibold">Pending tasks</h2>
						<Link to="/tasks" className="text-[13px] text-link hover:underline">
							All tasks →
						</Link>
					</div>
					{pending.length === 0 ? (
						<p className="px-5 py-6 text-center text-sm text-ink-muted">
							Nothing pending.
						</p>
					) : (
						<ul>
							{pending.slice(0, 6).map((t) => (
								<li
									key={t.id}
									className="flex items-start justify-between gap-3 border-b border-line px-5 py-2.5 text-sm last:border-b-0"
								>
									<span className="min-w-0">{t.detail}</span>
									<span
										className={`shrink-0 text-[11px] font-semibold tracking-[0.1em] uppercase ${t.priority === "High" ? "text-accent" : "text-ink-muted"}`}
									>
										{t.priority}
									</span>
								</li>
							))}
							{pending.length > 6 && (
								<li className="px-5 py-2 text-xs text-ink-muted">
									+{pending.length - 6} more
								</li>
							)}
						</ul>
					)}
				</Card>
			</div>
		</div>
	);
}

function Breakdown({
	caption,
	first,
	rows,
	link,
}: {
	caption: string;
	first: string;
	rows: Group[];
	link: "form" | "ovc_status";
}) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[640px] border-collapse text-sm">
				<caption className="px-5 pt-5 pb-1.5 text-left text-[15px] font-semibold sm:px-8">
					{caption}
				</caption>
				<thead>
					<tr className="h-8 text-[11px] tracking-[0.1em] text-ink-muted uppercase">
						<Th className="pl-5 text-left sm:pl-8">{first}</Th>
						<Th>Students</Th>
						<Th>Billed</Th>
						<Th>Received</Th>
						<Th>Due</Th>
						<Th className="w-44 pr-5 text-left sm:pr-8">Collected</Th>
					</tr>
				</thead>
				<tbody className="font-mono tabular-nums">
					{rows.map((r) => {
						const pct = r.billed
							? Math.round((r.received / r.billed) * 100)
							: 0;
						return (
							<tr key={r.key} className="h-9">
								<td className="border-b border-line pl-5 font-sans font-semibold sm:pl-8">
									<Link
										to="/students"
										search={{ [link]: r.key }}
										className="hover:text-accent hover:underline"
									>
										{r.key}
									</Link>
								</td>
								<td className="border-b border-line px-3 text-right">{r.n}</td>
								<td className="border-b border-line px-3 text-right text-ink-muted">
									{formatMoney(r.billed)}
								</td>
								<td className="border-b border-line px-3 text-right">
									{formatMoney(r.received)}
								</td>
								<td className="border-b border-line px-3 text-right font-semibold text-accent">
									{formatMoney(r.due)}
								</td>
								<td className="border-b border-line pr-5 pl-3 sm:pr-8">
									<span className="flex items-center gap-2">
										{/* biome-ignore lint/a11y/useSemanticElements: native <meter> cannot be styled consistently */}
										<span
											className="h-2 flex-1 bg-track"
											role="meter"
											aria-valuemin={0}
											aria-valuemax={100}
											aria-valuenow={pct}
											aria-label={`${r.key}: ${pct}% collected`}
										>
											<span
												className="block h-2 bg-ink"
												style={{ width: `${pct}%` }}
											/>
										</span>
										<span className="w-9 text-right text-xs text-ink-muted">
											{pct}%
										</span>
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function Th({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<th
			scope="col"
			className={`border-b border-ink px-3 font-medium ${className?.includes("text-left") ? "" : "text-right"} ${className ?? ""}`}
		>
			{children}
		</th>
	);
}

/** Single-series bar chart: amount received per month. The biggest month is red. */
function MonthlyChart({
	data,
	loading,
}: {
	data?: { month: string; amount: number }[];
	loading: boolean;
}) {
	const months = data ?? MONTHS.map((m) => ({ month: m, amount: 0 }));
	const max = Math.max(0, ...months.map((m) => m.amount));
	const peak = months.find((m) => m.amount === max && max > 0);
	const total = months.reduce((t, m) => t + m.amount, 0);

	return (
		<Card className="px-5 py-4">
			<h2 className="text-[15px] font-semibold">Received by month</h2>
			<p className="mb-4 text-xs text-ink-muted">
				{THIS_YEAR} · <span className="font-mono">{formatMoney(total)}</span>
				{peak && <> · peak in {peak.month}</>}
			</p>
			{loading ? (
				<Spinner />
			) : (
				<>
					<div
						role="img"
						aria-label={`Amount received per month in ${THIS_YEAR}`}
						className="flex h-40 items-end gap-1.5 border-b border-ink"
					>
						{months.map((m) => (
							<div
								key={m.month}
								title={`${m.month}: ${formatMoney(m.amount)}`}
								className={`flex-1 ${m === peak ? "bg-accent" : "bg-ink"}`}
								style={{
									height: max
										? `${Math.max(m.amount > 0 ? 2 : 0, (m.amount / max) * 100)}%`
										: 0,
								}}
							/>
						))}
					</div>
					<div className="mt-1.5 flex gap-1.5">
						{months.map((m) => (
							<span
								key={m.month}
								className="flex-1 text-center font-mono text-[10px] text-ink-faint"
							>
								{m.month.slice(0, 3)}
							</span>
						))}
					</div>
					{/* Table view of the same numbers */}
					<details className="mt-3 text-xs text-ink-muted">
						<summary className="cursor-pointer select-none">
							Show as table
						</summary>
						<table className="mt-2 w-full font-mono tabular-nums">
							<tbody>
								{months.map((m) => (
									<tr key={m.month}>
										<td className="py-0.5 font-sans">{m.month}</td>
										<td className="py-0.5 text-right text-ink">
											{formatMoney(m.amount)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</details>
				</>
			)}
		</Card>
	);
}
