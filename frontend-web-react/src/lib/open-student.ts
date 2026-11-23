import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

/**
 * Open (or close, with null) the student side panel on top of the current page.
 * The panel lives in the `?student=<id>` search param of the app layout, so it
 * works from any page and survives refresh / back button.
 */
export function useOpenStudent() {
	const navigate = useNavigate();
	return useCallback(
		(id: string | null) =>
			navigate({
				to: ".",
				// biome-ignore lint/suspicious/noExplicitAny: search shape differs per page; we only touch `student`
				search: (prev: any) => ({ ...prev, student: id ?? undefined }),
				replace: id === null,
			}),
		[navigate],
	);
}
