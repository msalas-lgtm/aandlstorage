"use client";

import { useActionState } from "react";
import { keepValues } from "@/lib/keep-form-values";
import type { RequestState } from "./actions";

const INITIAL: RequestState = { status: "idle", message: "" };

export function RequestForm({
  action,
  unitTypeId,
  dateLabel,
  submitLabel,
  signedInAs,
}: {
  action: (state: RequestState, data: FormData) => Promise<RequestState>;
  unitTypeId: number;
  dateLabel: string;
  submitLabel: string;
  // Set for a signed-in customer: their details come from their account, so those fields are left out.
  signedInAs?: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);

  if (state.status === "success" && state.message) {
    return (
      <p className="form-note ok" role="status">
        {state.message}
      </p>
    );
  }

  return (
    <form className="contact-form" action={formAction} onSubmit={keepValues(formAction)}>
      <input type="hidden" name="unitTypeId" value={unitTypeId} />
      {/* Spam trap: real visitors never see or fill this field. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {signedInAs ? (
        <p className="account-note">
          Joining as <strong>{signedInAs}</strong>. We&apos;ll use the contact details on your account.
        </p>
      ) : (
        <>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" autoComplete="name" required />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="Optional" />
          </div>
        </>
      )}
      <div className="field">
        <label htmlFor="date">{dateLabel}</label>
        <input id="date" name="date" type="date" />
      </div>
      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={4} placeholder="Anything we should know? (optional)" />
      </div>
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Sending..." : submitLabel}
      </button>
      {state.status === "error" && (
        <p className="form-note error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
