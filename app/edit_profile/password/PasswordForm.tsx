"use client";

import Link from "next/link";
import { useActionState } from "react";
import { keepValues } from "@/lib/keep-form-values";
import { changePasswordAction, type ProfileState } from "../actions";

const INITIAL: ProfileState = { status: "idle", message: "" };

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, INITIAL);
  return (
    <form action={action} onSubmit={keepValues(action)}>
      <div className="pcard-body contact-form">
        <div className="field">
          <label htmlFor="current">Current password</label>
          <input id="current" name="current" type="password" autoComplete="current-password" required />
        </div>
        <div className="field">
          <label htmlFor="next">New password</label>
          <input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm new password</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        {state.message && (
          <p className={`form-note ${state.status === "ok" ? "ok" : "error"}`} role="status">
            {state.message}
          </p>
        )}
      </div>
      <div className="pcard-foot pcard-foot-left">
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Change Password"}
        </button>
        <Link className="plink" href="/edit_profile">
          Back to profile
        </Link>
      </div>
    </form>
  );
}
