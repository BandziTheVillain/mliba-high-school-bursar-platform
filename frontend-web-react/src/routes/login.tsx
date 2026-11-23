import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Button, Card, ErrorNote, Field, Input } from "#/components/ui";
import { api } from "#/lib/api";
import { meQuery } from "#/lib/queries";

export const Route = createFileRoute("/login")({
	validateSearch: (s: Record<string, unknown>) => ({
		redirect: typeof s.redirect === "string" ? s.redirect : undefined,
	}),
	// Already signed in? Skip the form.
	beforeLoad: async ({ context, search }) => {
		const user = await context.queryClient
			.ensureQueryData(meQuery)
			.catch(() => null);
		if (user) throw redirect({ to: search.redirect ?? "/" });
	},
	component: LoginPage,
});

function LoginPage() {
	const { redirect: to } = Route.useSearch();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");

	const login = useMutation({
		mutationFn: () => api.login(username, password),
		onSuccess: ({ user }) => {
			qc.setQueryData(meQuery.queryKey, user);
			navigate({ to: to ?? "/" });
		},
	});

	const submit = (e: FormEvent) => {
		e.preventDefault();
		login.mutate();
	};

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-header px-4 py-10">
			<div className="w-full max-w-sm">
				<div className="mb-7 text-center text-white">
					<img
						src="/crest.png"
						alt="Mliba High School crest"
						className="mx-auto mb-4 h-auto w-24 bg-white p-2"
					/>
					<h1 className="text-2xl font-semibold tracking-tight">
						Mliba High School
					</h1>
					<p className="mt-1 text-sm text-white/60">
						Fee payments · staff sign in
					</p>
				</div>
				<Card className="border-t-4 border-t-brand p-6 shadow-xl">
					<form onSubmit={submit} className="space-y-4">
						<Field label="Username">
							<Input
								autoFocus
								autoComplete="username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								required
							/>
						</Field>
						<Field label="Password">
							<Input
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</Field>
						<ErrorNote error={login.error} />
						<Button
							type="submit"
							variant="primary"
							className="w-full"
							disabled={login.isPending}
						>
							{login.isPending ? "Signing in…" : "Sign in"}
						</Button>
					</form>
				</Card>
			</div>
		</div>
	);
}
