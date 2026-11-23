import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HeaderSearch } from "#/components/header-search";
import { StudentDetail, THIS_YEAR } from "#/components/student-detail";
import { Drawer } from "#/components/ui";
import { api } from "#/lib/api";
import { useOpenStudent } from "#/lib/open-student";
import { meQuery } from "#/lib/queries";

// Pathless layout: every child route requires a signed-in user.
// `?student=<id>` opens the student side panel on top of any page.
export const Route = createFileRoute("/_app")({
	validateSearch: (s: Record<string, unknown>): { student?: string } => ({
		student: typeof s.student === "string" && s.student ? s.student : undefined,
	}),
	beforeLoad: async ({ context, location }) => {
		try {
			await context.queryClient.ensureQueryData(meQuery);
		} catch {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}
	},
	component: AppLayout,
});

const TABS = [
	{ to: "/overview", label: "Overview" },
	{ to: "/students", label: "Fee register" },
	{ to: "/cards", label: "Payment cards" },
	{ to: "/tasks", label: "Tasks" },
] as const;

function AppLayout() {
	const { data: user } = useSuspenseQuery(meQuery);
	const qc = useQueryClient();
	const navigate = useNavigate();

	const logout = async () => {
		await api.logout().catch(() => {});
		qc.clear();
		navigate({ to: "/login", search: { redirect: undefined } });
	};

	return (
		<div className="flex min-h-screen flex-col">
			<header className="no-print sticky top-0 z-20 border-b-[3px] border-brand bg-header text-white">
				<div className="mx-auto flex max-w-375 flex-wrap items-center gap-x-6 px-4 sm:px-8 lg:h-16 lg:flex-nowrap">
					<Link
						to="/students"
						className="flex h-16 shrink-0 items-center gap-3"
					>
						<span className="flex size-9.5 items-center justify-center bg-white">
							<img src="/crest.png" alt="" className="h-8 w-auto" />
						</span>
						<span className="leading-tight">
							<span className="block text-[15px] font-semibold">
								Mliba High School
							</span>
							<span className="block text-[11px] tracking-[0.15em] text-white/55 uppercase">
								Bursar's office
							</span>
						</span>
					</Link>

					<UserMenu
						username={user.username}
						onLogout={logout}
						className="ml-auto lg:hidden"
					/>

					<nav
						aria-label="Main"
						className="order-last -mx-4 flex w-[calc(100%+2rem)] overflow-x-auto border-t border-header-line sm:-mx-8 sm:w-[calc(100%+4rem)] lg:order-0 lg:mx-0 lg:h-16 lg:w-auto lg:flex-1 lg:justify-center lg:border-t-0"
					>
						{TABS.map((t) => (
							<Link
								key={t.to}
								to={t.to}
								activeOptions={{ includeSearch: false }}
								className="flex h-12 shrink-0 items-center px-4 text-sm whitespace-nowrap text-white/65 hover:text-white lg:h-16 lg:px-5"
								activeProps={{
									className:
										"bg-white/8 font-semibold text-white! shadow-[inset_0_-3px_0_var(--brand)]",
								}}
							>
								{t.label}
							</Link>
						))}
					</nav>

					<div className="flex w-full items-center gap-4 pb-3 lg:w-88 lg:shrink-0 lg:pb-0">
						<HeaderSearch />
						<UserMenu
							username={user.username}
							onLogout={logout}
							className="hidden lg:flex"
						/>
					</div>
				</div>
			</header>

			<main className="mx-auto w-full max-w-375 min-w-0 flex-1 px-3 py-6 sm:px-8 sm:py-7">
				<Outlet />
			</main>

			<StudentPanel />
		</div>
	);
}

function UserMenu({
	username,
	onLogout,
	className,
}: {
	username: string;
	onLogout: () => void;
	className?: string;
}) {
	return (
		<div className={`flex shrink-0 items-center gap-3 ${className ?? ""}`}>
			<span
				title={username}
				className="flex size-8 items-center justify-center bg-accent text-sm font-semibold text-white uppercase"
			>
				{username.slice(0, 1)}
			</span>
			<button
				type="button"
				onClick={onLogout}
				className="text-sm text-white/65 hover:text-white cursor-pointer"
			>
				Log out
			</button>
		</div>
	);
}

/** The side panel for `?student=<id>`, available on every page. */
function StudentPanel() {
	const { student } = Route.useSearch();
	const openStudent = useOpenStudent();
	const [year, setYear] = useState(THIS_YEAR);

	// Each student opens on the current year
	useEffect(() => {
		if (student) setYear(THIS_YEAR);
	}, [student]);

	return (
		<Drawer
			open={!!student}
			onClose={() => openStudent(null)}
			label="Student account"
		>
			{student && (
				<StudentDetail
					key={student}
					studentId={student}
					year={year}
					onYearChange={setYear}
					variant="panel"
					topBar={
						<div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-line-strong bg-surface-2 pr-2 pl-5 sm:pl-7">
							<span className="text-xs tracking-[0.15em] text-ink-muted uppercase">
								Student account
							</span>
							<span className="flex items-center gap-1">
								<Link
									to="/students/$studentId"
									params={{ studentId: student }}
									search={{ year }}
									className="px-2.5 py-1.5 text-[13px] text-link hover:underline"
								>
									Open full page ↗
								</Link>
								<button
									type="button"
									onClick={() => openStudent(null)}
									aria-label="Close"
									// biome-ignore lint/a11y/noAutofocus: first focus in the panel; avoids ringing the link
									autoFocus
									className="px-2.5 py-1 text-lg text-ink-muted hover:text-ink cursor-pointer"
								>
									✕
								</button>
							</span>
						</div>
					}
				/>
			)}
		</Drawer>
	);
}
