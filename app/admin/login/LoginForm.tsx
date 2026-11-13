"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { keepValues } from "@/lib/keep-form-values";
import { loginAction, type ActionState } from "../actions";
import { AdminIcon } from "../AdminIcon";

const INITIAL: ActionState = { status: "idle", message: "" };

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, action, pending] = useActionState(loginAction, INITIAL);
  return (
    <form className="adm-form" action={action} onSubmit={keepValues(action)}>
      <input type="hidden" name="next" value={next} />
      <div className="adm-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="text" className="adm-input" autoComplete="username" autoCapitalize="none" required autoFocus />
      </div>
      <div className="adm-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="adm-input"
          autoComplete="current-password"
          required
        />
      </div>
      <button className="adm-btn is-primary" type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </button>
      {state.status === "error" && (
        <div className="adm-note is-err" role="alert">
          <AdminIcon name="info" size={18} />
          <div>{state.message}</div>
        </div>
      )}
    </form>
  );
}
