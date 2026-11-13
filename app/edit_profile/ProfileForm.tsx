"use client";

import Link from "next/link";
import { useActionState } from "react";
import { keepValues } from "@/lib/keep-form-values";
import { saveProfileAction, type ProfileState } from "./actions";

const INITIAL: ProfileState = { status: "idle", message: "" };

export function ProfileForm({
  username,
  email,
  textingConsent,
}: {
  username: string;
  email: string;
  textingConsent: boolean;
}) {
  const [state, action, pending] = useActionState(saveProfileAction, INITIAL);
  return (
    <form action={action} onSubmit={keepValues(action)}>
      <div className="pcard-body contact-form">
        <h3 className="pform-title">Account &amp; Access</h3>
        <div className="field">
          <label htmlFor="username">Username*</label>
          <input id="username" name="username" type="text" defaultValue={username} autoCapitalize="none" required />
        </div>
        <div className="field">
          <label htmlFor="email">Email*</label>
          <input id="email" name="email" type="email" defaultValue={email} required />
        </div>
        <p>
          <Link href="/edit_profile/password">Request Password Change</Link>
        </p>
        <label className="check-row" htmlFor="textingConsent">
          <input id="textingConsent" name="textingConsent" type="checkbox" defaultChecked={textingConsent} />
          <span>I agree to receive text message communications from this facility.</span>
        </label>
        {state.message && (
          <p className={`form-note ${state.status === "ok" ? "ok" : "error"}`} role="status">
            {state.message}
          </p>
        )}
      </div>
      <div className="pcard-foot pcard-foot-left">
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </button>
        <Link className="plink" href="/dashboard">
          Cancel
        </Link>
      </div>
      <p className="pcard-note">* Required fields are marked with an asterisk.</p>
    </form>
  );
}
