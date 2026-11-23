import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { StudentForm } from "#/components/student-form";
import {
	Button,
	Card,
	cx,
	Empty,
	ErrorNote,
	Figure,
	Input,
	Letterhead,
	Modal,
	Pagination,
	PayBadge,
	Select,
	Spinner,
} from "#/components/ui";
import {
	api,
	FORMS,
	OVC_STATUSES,
	type PayStatus,
	type RegisterSort,
} from "#/lib/api";
import { formatMoney } from "#/lib/format";
import { useOpenStudent } from "#/lib/open-student";
import { registerQuery } from "#/lib/queries";

const SIZES = [12, 25, 50, 100];
const SORTS: RegisterSort[] = ["name", "form", "billed", "received", "due"];
const STATUSES: { value: PayStatus; label: string }[] = [
	{ value: "unpaid", label: "Unpaid" },
	{ value: "partial", label: "Part paid" },
	{ value: "paid", label: "Paid in full" },
];

type Search = {
	q?: string;
	form?: string;
	ovc_status?: string;
	status?: PayStatus;
	sort?: RegisterSort;
	order?: "asc" | "desc";
	page?: number;
	size?: number;
};

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const int = (v: unknown) => {
	const n = Number(v);
	return Number.isInteger(n) && n > 0 ? n : undefined;
};

export const Route = createFileRoute("/_app/students/")({
	validateSearch: (s: Record<string, unknown>): Search => ({
		q: str(s.q),
		form: str(s.form),
		ovc_status: str(s.ovc_status),
		status: STATUSES.some((x) => x.value === s.status)
			? (s.status as PayStatus)
			: undefined,
		sort: SORTS.includes(s.sort as RegisterSort)
			? (s.sort as RegisterSort)
			: undefined,
		order: s.order === "desc" ? "desc" : undefined,
		page: int(s.page),
		size: SIZES.includes(Number(s.size)) ? Number(s.size) : undefined,
	}),
	component: FeeRegister,
});

function FeeRegister() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const openStudent = useOpenStudent();
	const openId = search.student; // highlighted while its side panel is open
	const [adding, setAdding] = useState(false);
	const [uploading, setUploading] = useState(false);

	const page = search.page ?? 1;
	const size = search.size ?? 25;
	const sort = search.sort ?? "name";
	const order = search.order ?? "asc";

	// Any filter change goes back to page 1
	const setSearch = (patch: Partial<Search>, keepPage = false) =>
		navigate({
			search: (s) => ({
				...s,
				...patch,
				...(keepPage ? {} : { page: undefined }),
			}),
		});

	// Debounce the name filter into the URL
	const [q, setQ] = useState(search.q ?? "");
	useEffect(() => setQ(search.q ?? ""), [search.q]);
	useEffect(() => {
		const t = setTimeout(() => {
			if ((search.q ?? "") !== q.trim())
				navigate({
					search: (s) => ({ ...s, q: q.trim() || undefined, page: undefined }),
					replace: true,
				});
		}, 300);
		return () => clearTimeout(t);
	}, [q, search.q, navigate]);

	const register = useQuery({
		...registerQuery({
			page,
			size,
			q: search.q,
			form: search.form,
			ovc_status: search.ovc_status,
			status: search.status,
			sort,
			order,
		}),
		placeholderData: keepPreviousData,
	});

	const data = register.data;
	const filtered = !!(
		search.q ||
		search.form ||
		search.ovc_status ||
		search.status
	);
	const rows = data?.items ?? [];
	const pageTotals = rows.reduce(
		(t, s) => ({
			billed: t.billed + s.fees.total,
			received: t.received + s.fees.paid,
			due: t.due + Math.max(0, s.fees.balance),
		}),
		{ billed: 0, received: 0, due: 0 },
	);

	const title =
		[search.form ? `Form ${search.form}` : "All forms", search.ovc_status]
			.filter(Boolean)
			.join(" · ") || "All forms";

	// First click on a money column shows the biggest amounts first; a second click flips it
	const toggleSort = (k: RegisterSort) => {
		const money = k === "billed" || k === "received" || k === "due";
		const next =
			sort === k ? (order === "asc" ? "desc" : "asc") : money ? "desc" : "asc";
		setSearch({
			sort: k === "name" ? undefined : k,
			order: next === "desc" ? "desc" : undefined,
		});
	};

	return (
		<>
			<Card className="flex flex-col">
				<Letterhead
					kicker="Student fee register"
					title={
						<>
							{title}{" "}
							{data && (
								<span className="font-mono text-sm font-normal text-ink-faint">
									{data.total} student{data.total === 1 ? "" : "s"}
								</span>
							)}
						</>
					}
					aside={
						data && (
							<div className="grid w-full grid-cols-3 divide-x divide-line-strong sm:flex sm:w-auto">
								<Figure
									label="Billed"
									value={formatMoney(data.totals.billed)}
									className="pr-3 sm:pr-5"
								/>
								<Figure
									label="Received"
									value={formatMoney(data.totals.received)}
									className="px-3 sm:px-5"
								/>
								<Figure
									label="Due"
									value={formatMoney(data.totals.due)}
									strong
									tone="due"
									className="pl-3 sm:pl-5"
								/>
							</div>
						)
					}
				/>

				{/* Filter bar */}
				<div className="no-print flex flex-wrap items-center gap-2.5 border-b border-line-strong bg-surface-2 px-5 py-2.5 sm:px-8">
					<Input
						type="search"
						aria-label="Filter by name"
						placeholder="Filter by name…"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						className="h-8! w-52"
					/>
					<Select
						aria-label="Form"
						value={search.form ?? ""}
						onChange={(e) => setSearch({ form: e.target.value || undefined })}
						className="h-8! w-32"
					>
						<option value="">All forms</option>
						{FORMS.map((f) => (
							<option key={f}>{f}</option>
						))}
					</Select>
					<Select
						aria-label="Payment status"
						value={search.status ?? ""}
						onChange={(e) =>
							setSearch({ status: (e.target.value || undefined) as PayStatus })
						}
						className="h-8! w-36"
					>
						<option value="">All entries</option>
						{STATUSES.map((s) => (
							<option key={s.value} value={s.value}>
								{s.label}
							</option>
						))}
					</Select>
					<Select
						aria-label="OVC status"
						value={search.ovc_status ?? ""}
						onChange={(e) =>
							setSearch({ ovc_status: e.target.value || undefined })
						}
						className="h-8! w-40"
					>
						<option value="">Any OVC status</option>
						{OVC_STATUSES.map((s) => (
							<option key={s}>{s}</option>
						))}
					</Select>
					{filtered && (
						<Button
							size="sm"
							variant="ghost"
							onClick={() => {
								setQ("");
								navigate({ search: (s) => ({ student: s.student }) });
							}}
						>
							Clear
						</Button>
					)}
					<span className="flex-1" />
					<Button size="sm" onClick={() => window.print()}>
						Print
					</Button>
					<Button size="sm" variant="solid" onClick={() => setUploading(true)}>
						Import CSV
					</Button>
					<Button size="sm" variant="primary" onClick={() => setAdding(true)}>
						New entry
					</Button>
				</div>

				{/* Ruled ledger */}
				{register.isPending ? (
					<Spinner />
				) : register.error ? (
					<div className="p-5 sm:px-8">
						<ErrorNote error={register.error} />
					</div>
				) : rows.length === 0 ? (
					<Empty
						title={filtered ? "No entries match" : "The register is empty"}
					>
						{filtered
							? "Try a different filter."
							: "Add a student with New entry, or import a CSV."}
					</Empty>
				) : (
					<div
						className={cx(
							"overflow-x-auto transition-opacity",
							register.isPlaceholderData && "opacity-60",
						)}
					>
						<table className="w-full min-w-[900px] border-collapse text-sm">
							<thead>
								<tr className="h-9 text-xs tracking-[0.08em] text-ink-muted uppercase">
									<Th className="w-14 pl-5 text-right sm:pl-8">No.</Th>
									<SortTh
										k="name"
										sort={sort}
										order={order}
										onSort={toggleSort}
									>
										Student
									</SortTh>
									<SortTh
										k="form"
										sort={sort}
										order={order}
										onSort={toggleSort}
									>
										Form
									</SortTh>
									<Th>OVC</Th>
									<SortTh
										k="billed"
										sort={sort}
										order={order}
										onSort={toggleSort}
										right
										ruled
									>
										Billed
									</SortTh>
									<SortTh
										k="received"
										sort={sort}
										order={order}
										onSort={toggleSort}
										right
										ruled
									>
										Received
									</SortTh>
									<SortTh
										k="due"
										sort={sort}
										order={order}
										onSort={toggleSort}
										right
										ruled
									>
										Due
									</SortTh>
									<Th className="w-28 pr-5 text-center sm:pr-8">Status</Th>
								</tr>
							</thead>
							<tbody className="font-mono tabular-nums">
								{rows.map((s, i) => {
									const due = Math.max(0, s.fees.balance);
									return (
										<tr
											key={s.id}
											onClick={() => openStudent(s.id)}
											className={cx(
												"h-10 cursor-pointer hover:bg-surface-2",
												openId === s.id &&
													"bg-accent-soft hover:bg-accent-soft",
											)}
										>
											<Td className="pl-5 text-right text-ink-faint sm:pl-8">
												{String(
													(data?.page ? data.page - 1 : 0) * size + i + 1,
												).padStart(3, "0")}
											</Td>
											<Td className="font-sans font-medium">
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														openStudent(s.id);
													}}
													className="text-left hover:text-accent hover:underline cursor-pointer"
												>
													{s.full_name}
												</button>
											</Td>
											<Td>{s.form}</Td>
											<Td className="font-sans text-[13px] text-ink-muted">
												{s.ovc_status}
												{s.practical_subjects_count > 0 && (
													<span className="text-ink-faint">
														{" "}
														· +{s.practical_subjects_count} prac.
													</span>
												)}
											</Td>
											<Td ruled className="text-right text-ink-muted">
												{formatMoney(s.fees.total)}
											</Td>
											<Td ruled className="text-right">
												{formatMoney(s.fees.paid)}
											</Td>
											<Td
												ruled
												className={cx(
													"text-right font-semibold",
													due > 0 ? "text-accent" : "text-ink-faint",
												)}
											>
												{formatMoney(due)}
											</Td>
											<Td className="pr-5 text-center sm:pr-8">
												<PayBadge fees={s.fees} />
											</Td>
										</tr>
									);
								})}
							</tbody>
							<tfoot className="font-mono tabular-nums">
								<tr className="h-10 font-semibold">
									<td
										colSpan={4}
										className="border-t-[3px] border-double border-ink pl-5 font-sans sm:pl-8"
									>
										Page total
										{data && data.pages > 1 && (
											<span className="font-normal text-ink-muted">
												{" "}
												· {data.page} of {data.pages}
											</span>
										)}
									</td>
									<td className="border-t-[3px] border-double border-ink px-3 text-right">
										{formatMoney(pageTotals.billed)}
									</td>
									<td className="border-t-[3px] border-double border-ink px-3 text-right">
										{formatMoney(pageTotals.received)}
									</td>
									<td className="border-t-[3px] border-double border-ink px-3 text-right text-accent">
										{formatMoney(pageTotals.due)}
									</td>
									<td className="border-t-[3px] border-double border-ink" />
								</tr>
							</tfoot>
						</table>
					</div>
				)}

				{data && data.total > 0 && (
					<div className="no-print">
						<Pagination
							page={data.page}
							pages={data.pages}
							total={data.total}
							size={size}
							sizes={SIZES}
							onPage={(p) => setSearch({ page: p === 1 ? undefined : p }, true)}
							onSize={(n) => setSearch({ size: n === 25 ? undefined : n })}
						/>
					</div>
				)}
			</Card>

			<AddStudentModal open={adding} onClose={() => setAdding(false)} />
			<UploadModal open={uploading} onClose={() => setUploading(false)} />
		</>
	);
}

function Th({
	children,
	className,
}: {
	children?: ReactNode;
	className?: string;
}) {
	return (
		<th
			scope="col"
			className={cx(
				"border-b border-ink px-3 text-left font-medium",
				className,
			)}
		>
			{children}
		</th>
	);
}

function Td({
	children,
	className,
	ruled,
}: {
	children?: ReactNode;
	className?: string;
	ruled?: boolean;
}) {
	return (
		<td
			className={cx(
				"border-b border-line px-3",
				ruled && "border-l",
				className,
			)}
		>
			{children}
		</td>
	);
}

function SortTh({
	k,
	sort,
	order,
	onSort,
	right,
	ruled,
	children,
}: {
	k: RegisterSort;
	sort: RegisterSort;
	order: "asc" | "desc";
	onSort: (k: RegisterSort) => void;
	right?: boolean;
	ruled?: boolean;
	children: ReactNode;
}) {
	const active = sort === k;
	return (
		<th
			scope="col"
			aria-sort={
				active ? (order === "asc" ? "ascending" : "descending") : "none"
			}
			className={cx(
				"border-b border-ink px-3 font-medium",
				right ? "text-right" : "text-left",
				ruled && "border-l border-l-line",
			)}
		>
			<button
				type="button"
				onClick={() => onSort(k)}
				className={cx(
					"inline-flex items-center gap-1 uppercase tracking-[0.08em] hover:text-ink cursor-pointer",
					active && "text-ink",
				)}
			>
				{children}
				<span aria-hidden className="w-2 text-[9px]">
					{active ? (order === "asc" ? "▲" : "▼") : ""}
				</span>
			</button>
		</th>
	);
}

function AddStudentModal({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const qc = useQueryClient();
	const openStudent = useOpenStudent();
	const add = useMutation({
		mutationFn: api.addStudent,
		onSuccess: (s) => {
			qc.invalidateQueries({ queryKey: ["students"] });
			onClose();
			openStudent(s.id); // straight into the panel to record payments
		},
	});
	return (
		<Modal
			open={open}
			onClose={() => {
				add.reset();
				onClose();
			}}
			title="New register entry"
		>
			<StudentForm
				submitLabel="Add student"
				pending={add.isPending}
				error={add.error}
				onSubmit={(v) => add.mutate(v)}
				onCancel={onClose}
			/>
		</Modal>
	);
}

function UploadModal({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const qc = useQueryClient();
	const fileRef = useRef<HTMLInputElement>(null);
	const [file, setFile] = useState<File | null>(null);
	const upload = useMutation({
		mutationFn: api.uploadStudents,
		onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
	});
	const close = () => {
		upload.reset();
		setFile(null);
		onClose();
	};
	return (
		<Modal open={open} onClose={close} title="Import students (CSV)">
			{upload.isSuccess ? (
				<div className="space-y-4">
					<p className="border-l-[3px] border-good bg-good-soft px-3 py-2 text-sm text-good-text">
						✓ {upload.data.message}
					</p>
					<div className="flex justify-end">
						<Button variant="primary" onClick={close}>
							Done
						</Button>
					</div>
				</div>
			) : (
				<form
					className="space-y-4"
					onSubmit={(e) => {
						e.preventDefault();
						if (file) upload.mutate(file);
					}}
				>
					<p className="text-sm text-ink-2">
						Columns needed: <b>Full Name</b>, <b>Form</b>, <b>Amount To Pay</b>{" "}
						and one column per month (<b>January</b> … <b>December</b>).
						Optionally add a <b>Practical Subjects</b> column (a number); leave
						it out and everyone gets 0. Payments are recorded for the current
						year. Students already in the register (same name and form) are
						skipped.
					</p>
					<button
						type="button"
						onClick={() => fileRef.current?.click()}
						className="flex w-full flex-col items-center border-2 border-dashed border-field px-4 py-8 text-sm text-ink-muted hover:border-ink hover:text-ink cursor-pointer"
					>
						{file ? (
							<span className="font-mono font-medium text-ink">
								{file.name}
							</span>
						) : (
							"Click to choose a .csv file"
						)}
					</button>
					<input
						ref={fileRef}
						type="file"
						accept=".csv,text/csv"
						className="hidden"
						onChange={(e) => setFile(e.target.files?.[0] ?? null)}
					/>
					<ErrorNote error={upload.error} />
					<div className="flex justify-end gap-2">
						<Button variant="ghost" onClick={close}>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={!file || upload.isPending}
						>
							{upload.isPending ? "Importing…" : "Import"}
						</Button>
					</div>
				</form>
			)}
		</Modal>
	);
}
