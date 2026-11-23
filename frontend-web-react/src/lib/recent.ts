// "Recently viewed students" - a per-browser convenience kept in localStorage.
// Every access is guarded: storage can be unavailable (private mode, blocked).
import { useSyncExternalStore } from "react";
import type { Student } from "./api";

export type RecentStudent = Pick<Student, "id" | "full_name" | "form">;

const KEY = "recent-students";
const MAX = 8;
const listeners = new Set<() => void>();
let cache: RecentStudent[] | null = null;

function read(): RecentStudent[] {
	if (cache) return cache;
	try {
		const raw = localStorage.getItem(KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		cache = Array.isArray(parsed) ? parsed : [];
	} catch {
		cache = [];
	}
	return cache;
}

function write(list: RecentStudent[]) {
	cache = list;
	try {
		localStorage.setItem(KEY, JSON.stringify(list));
	} catch {
		/* storage unavailable - keep in memory only */
	}
	for (const l of listeners) l();
}

export function rememberStudent(s: RecentStudent) {
	const rest = read().filter((r) => r.id !== s.id);
	const next = [{ id: s.id, full_name: s.full_name, form: s.form }, ...rest];
	const prev = read();
	// Skip the write (and re-render) if nothing changed
	if (
		prev[0]?.id === s.id &&
		prev[0]?.full_name === s.full_name &&
		prev[0]?.form === s.form
	)
		return;
	write(next.slice(0, MAX));
}

export function forgetStudent(id: string) {
	write(read().filter((r) => r.id !== id));
}

export function useRecentStudents() {
	return useSyncExternalStore(
		(cb) => {
			listeners.add(cb);
			return () => listeners.delete(cb);
		},
		read,
		() => [],
	);
}
