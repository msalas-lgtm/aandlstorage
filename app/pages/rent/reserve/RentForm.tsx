"use client";

import { useActionState } from "react";
import { keepValues } from "@/lib/keep-form-values";
import { rentUnitAction, type RentState } from "./actions";

const INITIAL: RentState = { status: "idle", message: "" };

export function RentForm({
  unitTypeId,
  minDate,
  maxDate,
}: {
  unitTypeId: number;
  minDate: string;
  maxDate: string;
}) {
  const [state, action, pending] = useActionState(rentUnitAction, INITIAL);
  return (
    <form className="contact-form" action={action} onSubmit={keepValues(action)}>
      <input type="hidden" name="unitTypeId" value={unitTypeId} />
      {/* Spam trap: real visitors never see or fill this field. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="name">Full name</label>
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
      <div className="field">
        <label htmlFor="moveIn">Move-in date</label>
        <input id="moveIn" name="moveIn" type="date" min={minDate} max={maxDate} defaultValue={minDate} required />
      </div>
      <div className="field">
        <label htmlFor="username">Choose a username</label>
        <input id="username" name="username" type="text" autoComplete="username" autoCapitalize="none" required />
      </div>
      <div className="field">
        <label htmlFor="password">Choose a password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <p className="account-note">
        You&apos;ll use this username and password to sign in and see your account. At least 8 characters.
      </p>
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Reserving your unit..." : "Rent This Unit"}
      </button>
      {state.status === "error" && (
        <p className="form-note error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
