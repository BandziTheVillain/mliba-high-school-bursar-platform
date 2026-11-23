import { type FormEvent, useState } from "react";
import {
	FORMS,
	type Form,
	OVC_STATUSES,
	type OvcStatus,
	type StudentInput,
} from "#/lib/api";
import { formatMoney, PRACTICAL_SUBJECT_FEE } from "#/lib/format";
import { Button, ErrorNote, Field, Input, Select } from "./ui";

export type StudentFormValues = StudentInput;

const MAX_PRACTICALS = 10; // matches backend validation

export function StudentForm({
	initial,
	submitLabel,
	pending,
	error,
	onSubmit,
	onCancel,
}: {
	initial?: StudentFormValues;
	submitLabel: string;
	pending: boolean;
	error: unknown;
	onSubmit: (v: StudentFormValues) => void;
	onCancel: () => void;
}) {
	const [v, setV] = useState<StudentFormValues>(
		initial ?? {
			full_name: "",
			form: "F1A",
			ovc_status: "Non OVC",
			practical_subjects_count: 0,
		},
	);
	const submit = (e: FormEvent) => {
		e.preventDefault();
		onSubmit({ ...v, full_name: v.full_name.trim() });
	};
	return (
		<form onSubmit={submit} className="space-y-4">
			<Field label="Full name">
				<Input
					autoFocus
					required
					value={v.full_name}
					onChange={(e) => setV({ ...v, full_name: e.target.value })}
				/>
			</Field>
			<div className="grid grid-cols-2 gap-3">
				<Field label="Form">
					<Select
						value={v.form}
						onChange={(e) => setV({ ...v, form: e.target.value as Form })}
					>
						{FORMS.map((f) => (
							<option key={f}>{f}</option>
						))}
					</Select>
				</Field>
				<Field label="OVC status">
					<Select
						value={v.ovc_status}
						onChange={(e) =>
							setV({ ...v, ovc_status: e.target.value as OvcStatus })
						}
					>
						{OVC_STATUSES.map((s) => (
							<option key={s}>{s}</option>
						))}
					</Select>
				</Field>
			</div>
			<Field
				label="Practical subjects"
				hint={`Each practical subject adds ${formatMoney(PRACTICAL_SUBJECT_FEE)} to the fee.`}
			>
				<Input
					type="number"
					inputMode="numeric"
					min={0}
					max={MAX_PRACTICALS}
					step={1}
					required
					value={v.practical_subjects_count}
					onChange={(e) =>
						setV({
							...v,
							practical_subjects_count: Math.min(
								MAX_PRACTICALS,
								Math.max(0, Math.trunc(Number(e.target.value) || 0)),
							),
						})
					}
					className="w-28"
				/>
			</Field>
			<ErrorNote error={error} />
			<div className="flex justify-end gap-2 pt-1">
				<Button variant="ghost" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" variant="primary" disabled={pending}>
					{pending ? "Saving…" : submitLabel}
				</Button>
			</div>
		</form>
	);
}
