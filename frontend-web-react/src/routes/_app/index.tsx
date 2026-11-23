import { createFileRoute, redirect } from "@tanstack/react-router";

// Searching moved into the header, so "/" lands on the fee register:
// the screen the bursar works in all day.
export const Route = createFileRoute("/_app/")({
	beforeLoad: ({ search }) => {
		throw redirect({ to: "/students", search });
	},
});
