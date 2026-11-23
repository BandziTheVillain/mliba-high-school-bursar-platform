import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import {
	Button,
	Card,
	cx,
	Empty,
	ErrorNote,
	Input,
	PageHeader,
	Select,
	Spinner,
} from "#/components/ui";
import { api, type Task, type TaskPriority } from "#/lib/api";
import { tasksQuery } from "#/lib/queries";

export const Route = createFileRoute("/_app/tasks")({
	loader: ({ context }) => context.queryClient.prefetchQuery(tasksQuery),
	component: TasksPage,
});

const PRIORITIES: TaskPriority[] = ["High", "Medium", "Low"];
const priorityStyle: Record<TaskPriority, string> = {
	High: "border-accent text-accent",
	Medium: "border-warning-text text-warning-text",
	Low: "border-field text-ink-muted",
};

function TasksPage() {
	const tasks = useQuery(tasksQuery);
	const [showDone, setShowDone] = useState(false);

	const list = tasks.data ?? [];
	const pending = list.filter((t) => t.status === "Pending");
	const done = list.filter((t) => t.status === "Completed");
	const rank = (t: Task) => PRIORITIES.indexOf(t.priority);
	pending.sort((a, b) => rank(a) - rank(b));

	return (
		<>
			<PageHeader
				title="Tasks"
				subtitle={`${pending.length} pending · ${done.length} completed`}
			/>
			<AddTask />
			<Card className="mt-4 overflow-hidden">
				{tasks.isPending ? (
					<Spinner />
				) : tasks.error ? (
					<div className="p-4">
						<ErrorNote error={tasks.error} />
					</div>
				) : pending.length === 0 ? (
					<Empty title="All caught up">No pending tasks.</Empty>
				) : (
					<ul>
						{pending.map((t) => (
							<TaskRow key={t.id} task={t} />
						))}
					</ul>
				)}
			</Card>

			{done.length > 0 && (
				<div className="mt-6">
					<button
						type="button"
						onClick={() => setShowDone((s) => !s)}
						className="mb-2 text-sm text-ink-muted hover:text-ink cursor-pointer"
						aria-expanded={showDone}
					>
						{showDone ? "▾" : "▸"} Completed ({done.length})
					</button>
					{showDone && (
						<Card className="overflow-hidden">
							<ul>
								{done.map((t) => (
									<TaskRow key={t.id} task={t} />
								))}
							</ul>
						</Card>
					)}
				</div>
			)}
		</>
	);
}

function AddTask() {
	const qc = useQueryClient();
	const [detail, setDetail] = useState("");
	const [priority, setPriority] = useState<TaskPriority>("Medium");
	const add = useMutation({
		mutationFn: api.addTask,
		onSuccess: () => {
			setDetail("");
			qc.invalidateQueries({ queryKey: ["tasks"] });
		},
	});
	const submit = (e: FormEvent) => {
		e.preventDefault();
		if (detail.trim()) add.mutate({ detail: detail.trim(), priority });
	};
	return (
		<form onSubmit={submit} className="space-y-2">
			<div className="flex flex-wrap gap-2">
				<Input
					placeholder="Add a task, e.g. Follow up with F3B parents"
					value={detail}
					onChange={(e) => setDetail(e.target.value)}
					className="min-w-0 flex-1 basis-64"
				/>
				<Select
					aria-label="Priority"
					value={priority}
					onChange={(e) => setPriority(e.target.value as TaskPriority)}
					className="w-32"
				>
					{PRIORITIES.map((p) => (
						<option key={p}>{p}</option>
					))}
				</Select>
				<Button
					type="submit"
					variant="primary"
					disabled={!detail.trim() || add.isPending}
				>
					Add
				</Button>
			</div>
			<ErrorNote error={add.error} />
		</form>
	);
}

function TaskRow({ task }: { task: Task }) {
	const qc = useQueryClient();
	const done = task.status === "Completed";
	const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });
	const toggle = useMutation({
		mutationFn: () =>
			api.editTask(task.id, {
				detail: task.detail,
				priority: task.priority,
				status: done ? "Pending" : "Completed",
			}),
		onSuccess: invalidate,
	});
	const remove = useMutation({
		mutationFn: () => api.deleteTask(task.id),
		onSuccess: invalidate,
	});
	const error = toggle.error ?? remove.error;

	return (
		<li className="group border-t border-line px-4 py-3 first:border-t-0">
			<div className="flex items-start gap-3">
				<input
					type="checkbox"
					checked={done}
					disabled={toggle.isPending}
					onChange={() => toggle.mutate()}
					aria-label={done ? "Mark as pending" : "Mark as completed"}
					className="mt-0.5 size-4 shrink-0 accent-[var(--ink)] cursor-pointer"
				/>
				<div className="min-w-0 flex-1">
					<p className={cx("text-sm", done && "text-ink-muted line-through")}>
						{task.detail}
					</p>
					<p className="mt-0.5 text-xs text-ink-muted">
						{new Date(task.date_created).toLocaleDateString(undefined, {
							day: "numeric",
							month: "short",
							year: "numeric",
						})}
					</p>
				</div>
				<span
					className={cx(
						"shrink-0 border-[1.5px] px-2 py-px text-[11px] font-semibold uppercase tracking-[0.1em]",
						priorityStyle[task.priority],
					)}
				>
					{task.priority}
				</span>
				<Button
					variant="danger"
					size="sm"
					onClick={() => {
						if (confirm("Delete this task?")) remove.mutate();
					}}
					disabled={remove.isPending}
					aria-label="Delete task"
					className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
				>
					Delete
				</Button>
			</div>
			{error && (
				<div className="mt-2">
					<ErrorNote error={error} />
				</div>
			)}
		</li>
	);
}
