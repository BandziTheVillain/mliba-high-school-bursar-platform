import { queryOptions } from "@tanstack/react-query";
import {
	api,
	type PaymentType,
	type RegisterQuery,
	type StudentFilters,
} from "./api";

export const registerQuery = (r: RegisterQuery) =>
	queryOptions({
		// Under "students" so payment edits / new students refresh it too
		queryKey: ["students", "register", r],
		queryFn: () => api.register(r),
	});

export const monthlyQuery = (year: number) =>
	queryOptions({
		queryKey: ["students", "monthly", year],
		queryFn: () => api.monthly(year),
	});

export const meQuery = queryOptions({
	queryKey: ["me"],
	queryFn: api.me,
	retry: false,
	staleTime: 5 * 60_000,
});

export const studentsQuery = (f: StudentFilters = {}) =>
	queryOptions({
		queryKey: ["students", "list", f],
		queryFn: () => api.students(f),
	});

export const studentQuery = (id: string) =>
	queryOptions({
		queryKey: ["students", "detail", id],
		queryFn: () => api.student(id),
	});

export const paymentsQuery = (id: string, year: number) =>
	queryOptions({
		queryKey: ["students", "payments", id, year],
		queryFn: () => api.payments(id, year),
	});

export const byPaymentTypeQuery = (t: PaymentType) =>
	queryOptions({
		queryKey: ["students", "by-type", t],
		queryFn: () => api.studentsByPaymentType(t),
	});

export const tasksQuery = queryOptions({
	queryKey: ["tasks"],
	queryFn: api.tasks,
});
