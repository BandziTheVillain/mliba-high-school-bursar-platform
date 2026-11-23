import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	type KeyboardEvent,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Student } from "#/lib/api";
import { formatMoney } from "#/lib/format";
import { useOpenStudent } from "#/lib/open-student";
import { studentsQuery } from "#/lib/queries";
import { useRecentStudents } from "#/lib/recent";
import { cx, PayBadge } from "./ui";

const MAX = 8;

/** Every word must appear in the name or start the form ("thabo f3"). */
function matches(s: Student, words: string[]) {
	const name = s.full_name.toLowerCase();
	const form = s.form.toLowerCase();
	return words.every((w) => name.includes(w) || form.startsWith(w));
}

/**
 * The header's "Find a student" box: a combobox over all students.
 * Empty + focused shows recently viewed; typing filters; Enter opens the
 * student's side panel. "/" anywhere focuses it.
 */
export function HeaderSearch() {
	const [q, setQ] = useState("");
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const boxRef = useRef<HTMLDivElement>(null);
	const listId = useId();
	const openStudent = useOpenStudent();
	const recent = useRecentStudents();
	// Only fetch the full list once the box is used
	const students = useQuery({ ...studentsQuery({}), enabled: open });

	const all = useMemo(() => students.data ?? [], [students.data]);
	const query = q.trim().toLowerCase();
	const results = useMemo(() => {
		const words = query.split(/\s+/).filter(Boolean);
		if (!words.length) return [];
		return all
			.filter((s) => matches(s, words))
			.sort((a, b) => a.full_name.localeCompare(b.full_name));
	}, [all, query]);

	const byId = useMemo(() => new Map(all.map((s) => [s.id, s])), [all]);
	const recentStudents = recent
		.map((r) => byId.get(r.id))
		.filter((s): s is Student => !!s)
		.slice(0, 6);

	const shown = query ? results.slice(0, MAX) : recentStudents;

	// "/" anywhere (outside a field or dialog) focuses the search
	useEffect(() => {
		const onKey = (e: globalThis.KeyboardEvent) => {
			if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
			const t = e.target as HTMLElement;
			if (
				t.isContentEditable ||
				["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) ||
				document.querySelector("dialog[open]")
			)
				return;
			e.preventDefault();
			inputRef.current?.focus();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	// Close when focus or a click leaves the box
	useEffect(() => {
		const onDown = (e: MouseEvent) => {
			if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, []);

	const pick = (s: Student) => {
		openStudent(s.id);
		setOpen(false);
		setQ("");
		inputRef.current?.blur();
	};

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Escape") {
			setOpen(false);
			e.currentTarget.blur();
			return;
		}
		if (!shown.length) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setOpen(true);
			setActive((i) => (i + 1) % shown.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActive((i) => (i - 1 + shown.length) % shown.length);
		} else if (e.key === "Enter") {
			e.preventDefault();
			pick(shown[Math.min(active, shown.length - 1)]);
		}
	};

	const showPanel = open && (query || recentStudents.length > 0);

	return (
		<div ref={boxRef} className="relative w-full">
			<label className="flex h-9.5 items-center gap-2 border border-header-line bg-header-2 px-3 text-white/60 focus-within:border-white/70">
				<svg
					aria-hidden="true"
					width="15"
					height="15"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
				>
					<circle cx="11" cy="11" r="7" />
					<path d="M21 21l-4.3-4.3" />
				</svg>
				<input
					ref={inputRef}
					type="search"
					role="combobox"
					aria-label="Find a student"
					aria-expanded={!!showPanel}
					aria-controls={listId}
					aria-activedescendant={
						showPanel && shown[active]
							? `${listId}-${shown[active].id}`
							: undefined
					}
					autoComplete="off"
					spellCheck={false}
					placeholder="Find a student"
					value={q}
					onChange={(e) => {
						setQ(e.target.value);
						setActive(0);
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					onKeyDown={onKeyDown}
					className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50"
				/>
				<kbd className="border border-header-line px-1.5 font-mono text-[11px] leading-4">
					/
				</kbd>
			</label>

			{showPanel && (
				<div className="absolute top-full right-0 z-30 mt-1.5 w-[min(30rem,calc(100vw-1.5rem))] bg-surface text-ink shadow-2xl ring-1 ring-black/10">
					<div className="border-b border-line px-4 py-2 text-[11px] tracking-[0.12em] text-ink-muted uppercase">
						{query
							? students.isPending
								? "Searching…"
								: `${results.length} match${results.length === 1 ? "" : "es"}`
							: "Recently viewed"}
					</div>
					{query && !students.isPending && results.length === 0 ? (
						<p className="px-4 py-5 text-sm text-ink-muted">
							No student matches “{q.trim()}”.
						</p>
					) : (
						<div id={listId} role="listbox" aria-label="Students">
							{shown.map((s, i) => (
								// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard is handled by the combobox input
								<div
									key={s.id}
									id={`${listId}-${s.id}`}
									role="option"
									aria-selected={i === active}
									tabIndex={-1}
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => pick(s)}
									onMouseMove={() => setActive(i)}
									className={cx(
										"flex cursor-pointer items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0",
										i === active && "bg-surface-2",
									)}
								>
									<span className="min-w-0 flex-1">
										<span className="block truncate font-medium">
											{s.full_name}
										</span>
										<span className="block text-xs text-ink-muted">
											<span className="font-mono">{s.form}</span> ·{" "}
											{s.ovc_status}
										</span>
									</span>
									<PayBadge fees={s.fees} />
									<span className="w-24 text-right font-mono text-sm tabular-nums">
										{formatMoney(Math.max(0, s.fees.balance))}
									</span>
								</div>
							))}
						</div>
					)}
					<div className="flex items-center gap-4 border-t border-line bg-surface-2 px-4 py-2 text-xs text-ink-muted">
						<span>↑↓ move · Enter open · Esc close</span>
						{query && results.length > MAX && (
							<Link
								to="/students"
								search={{ q: q.trim() }}
								onClick={() => setOpen(false)}
								className="ml-auto text-link hover:underline"
							>
								All {results.length} in the register →
							</Link>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
