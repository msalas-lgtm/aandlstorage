"use client";

import Link from "next/link";
import { useActionState } from "react";
import { keepValues } from "@/lib/keep-form-values";
import { recoverUsernameAction, type RecoveryState } from "./actions";

const INITIAL: RecoveryState = { status: "idle", message: "" };

export function RecoveryForm() {
  const [state, action, pending] = useActionState(recoverUsernameAction, INITIAL);

  if (state.status === "done") {
    return (
      <div className="auth-form">
        <p className="form-note ok" role="status">
          {state.message}
        </p>
        <div className="auth-links">
          <Link href="/login">Back to log in</Link>
        </div>
      </div>
    );
  }

  return (
    <form className="contact-form auth-form" action={action} onSubmit={keepValues(action)}>
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send my username"}
      </button>
      {state.status === "error" && (
        <p className="form-note error" role="alert">
          {state.message}
        </p>
      )}
      <div className="auth-links">
        <Link href="/login">Back to log in</Link>
      </div>
    </form>
  );
}
