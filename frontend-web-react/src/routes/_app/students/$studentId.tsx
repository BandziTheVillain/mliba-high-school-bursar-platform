import { createFileRoute, Link } from "@tanstack/react-router";
import { StudentDetail, THIS_YEAR } from "#/components/student-detail";
import { paymentsQuery, studentQuery } from "#/lib/queries";

// Full-page view of a student. Most of the time the side panel is used instead;
// this page exists for direct links, bookmarks and printing.
export const Route = createFileRoute("/_app/students/$studentId")({
	validateSearch: (s: Record<string, unknown>): { year?: number } => {
		const y = Number(s.year);
		return { year: Number.isInteger(y) && y > 2000 ? y : undefined };
	},
	loaderDeps: ({ search }) => ({ year: search.year ?? THIS_YEAR }),
	loader: ({ context, params, deps }) =>
		Promise.all([
			context.queryClient.prefetchQuery(studentQuery(params.studentId)),
			context.queryClient.prefetchQuery(
				paymentsQuery(params.studentId, deps.year),
			),
		]),
	component: StudentPage,
});

function StudentPage() {
	const { studentId } = Route.useParams();
	const year = Route.useSearch().year ?? THIS_YEAR;
	const navigate = Route.useNavigate();

	return (
		<div className="mx-auto max-w-4xl">
			<StudentDetail
				studentId={studentId}
				year={year}
				variant="page"
				onYearChange={(y) =>
					navigate({ search: (s) => ({ ...s, year: y }), replace: true })
				}
				topBar={
					<Link
						to="/students"
						className="mb-4 inline-block text-sm text-ink-muted hover:text-ink"
					>
						← Fee register
					</Link>
				}
			/>
		</div>
	);
}
