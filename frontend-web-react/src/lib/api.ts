// Thin fetch wrapper around the FastAPI backend.
// Auth is an httponly cookie set by POST /api/auth/token, so every request
// just needs `credentials: "include"` - the token is never touched in JS.

export const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
] as const;
export type Month = (typeof MONTHS)[number];

export const FORMS = [
	"F1A",
	"F1B",
	"F1C",
	"F2A",
	"F2B",
	"F3A",
	"F3B",
	"F3C",
	"F4A",
	"F4B",
	"F4C",
	"F5A",
	"F5B",
	"F5C",
] as const;
export type Form = (typeof FORMS)[number];

export const OVC_STATUSES = ["OVC", "Non OVC", "OVC (Form 4)"] as const;
export type OvcStatus = (typeof OVC_STATUSES)[number];

export type User = { id: string; username: string };

export type Fees = { paid: number; balance: number; total: number };

export type Student = {
	id: string;
	full_name: string;
	form: Form;
	ovc_status: OvcStatus;
	practical_subjects_count: number;
	fees: Fees;
};

/** Editable student fields (add / edit). */
export type StudentInput = Pick<
	Student,
	"full_name" | "form" | "ovc_status" | "practical_subjects_count"
>;

export type Payment = {
	id: string | null;
	month: Month;
	year: number;
	amount: number;
};

export type TaskStatus = "Pending" | "Completed";
export type TaskPriority = "High" | "Medium" | "Low";
export type Task = {
	id: string;
	detail: string;
	status: TaskStatus;
	priority: TaskPriority;
	date_created: string;
};

export type PaymentType = "full" | "deposit" | "partial";

export type PayStatus = "paid" | "partial" | "unpaid";
export type RegisterSort = "name" | "form" | "billed" | "received" | "due";

export type RegisterQuery = {
	page?: number;
	size?: number;
	q?: string;
	form?: string;
	ovc_status?: string;
	status?: PayStatus;
	sort?: RegisterSort;
	order?: "asc" | "desc";
};

export type RegisterPage = {
	items: Student[];
	total: number;
	page: number;
	size: number;
	pages: number;
	totals: { billed: number; received: number; due: number; fully_paid: number };
};

export type MonthlyReceipt = { month: Month; amount: number };

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
	}
}

const BASE = "/api";

async function errorFrom(res: Response): Promise<ApiError> {
	let message = res.statusText || "Request failed";
	try {
		const body = await res.json();
		if (typeof body.detail === "string") message = body.detail;
		else if (Array.isArray(body.detail))
			message = body.detail.map((d: { msg: string }) => d.msg).join(", ");
	} catch {
		/* non-JSON error body */
	}
	return new ApiError(res.status, message);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	const res = await fetch(BASE + path, { credentials: "include", ...init });
	if (!res.ok) {
		const err = await errorFrom(res);
		// Session expired mid-use: bounce to login (but not for the auth calls themselves)
		if (
			err.status === 401 &&
			!path.startsWith("/auth/") &&
			window.location.pathname !== "/login"
		) {
			window.location.assign(
				`/login?redirect=${encodeURIComponent(window.location.pathname)}`,
			);
		}
		throw err;
	}
	if (res.status === 204) return undefined as T;
	return res.json() as Promise<T>;
}

const json = (method: string, body: unknown): RequestInit => ({
	method,
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify(body),
});

/** Download a binary response (PDF) and save it via a temporary link. */
async function download(path: string, init: RequestInit, fallbackName: string) {
	const res = await fetch(BASE + path, { credentials: "include", ...init });
	if (!res.ok) throw await errorFrom(res);
	const disposition = res.headers.get("Content-Disposition") ?? "";
	const match =
		/filename\*=UTF-8''([^;]+)/.exec(disposition) ??
		/filename="([^"]+)"/.exec(disposition);
	const name = match ? decodeURIComponent(match[1]) : fallbackName;
	const url = URL.createObjectURL(await res.blob());
	const a = document.createElement("a");
	a.href = url;
	a.download = name;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type StudentFilters = {
	q?: string;
	form?: string;
	ovc_status?: string;
};

function qs(params: Record<string, string | number | undefined>) {
	const s = new URLSearchParams();
	for (const [k, v] of Object.entries(params))
		if (v !== undefined && v !== "") s.set(k, String(v));
	const str = s.toString();
	return str ? `?${str}` : "";
}

export const api = {
	login: (username: string, password: string) =>
		request<{ user: User }>("/auth/token", {
			method: "POST",
			body: new URLSearchParams({ username, password }),
		}),
	logout: () => request<unknown>("/auth/logout", { method: "POST" }),
	me: () => request<{ user: User }>("/auth/me").then((r) => r.user),

	students: (f: StudentFilters = {}) => request<Student[]>(`/students${qs(f)}`),
	register: (r: RegisterQuery) =>
		request<RegisterPage>(`/students/register${qs(r)}`),
	monthly: (year: number) =>
		request<MonthlyReceipt[]>(`/stats/monthly${qs({ year })}`),
	student: (id: string) => request<Student>(`/students/${id}`),
	addStudent: (data: StudentInput) =>
		request<Student>("/students", json("POST", { ...data, payments: [] })),
	editStudent: (id: string, data: StudentInput) =>
		request<Student>(`/students/${id}`, json("PUT", data)),
	uploadStudents: (file: File) => {
		const body = new FormData();
		body.append("file", file);
		return request<{ success: boolean; message: string }>("/students/upload", {
			method: "POST",
			body,
		});
	},

	payments: (id: string, year: number) =>
		request<Payment[]>(`/students/${id}/payments${qs({ year })}`),
	setPayment: (
		id: string,
		data: { month: Month; year: number; amount: number },
	) => request<Payment>(`/students/${id}/payments`, json("PUT", data)),

	studentsByPaymentType: (payment_type: PaymentType) =>
		request<Student[]>(`/students/filter${qs({ payment_type })}`),
	downloadCard: (id: string, name: string) =>
		download(`/students/${id}/generate-card`, {}, `${name}_card.pdf`),
	// payment_type is left empty on purpose: the ids are already filtered on
	// screen, and the backend's own type filter treats "partial" like "full".
	downloadCards: (ids: string[]) =>
		download(
			"/students/generate-cards",
			json("POST", { ids, payment_type: "" }),
			"student_cards.pdf",
		),

	tasks: () => request<Task[]>("/tasks"),
	addTask: (data: { detail: string; priority: TaskPriority }) =>
		request<Task>("/tasks", json("POST", { ...data, status: "Pending" })),
	editTask: (
		id: string,
		data: { detail: string; priority: TaskPriority; status: TaskStatus },
	) => request<Task>(`/tasks/${id}`, json("PUT", data)),
	deleteTask: (id: string) =>
		request<unknown>(`/tasks/${id}`, { method: "DELETE" }),
};
