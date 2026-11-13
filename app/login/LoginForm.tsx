"use client";

import Link from "next/link";
import { useActionState } from "react";
import { keepValues } from "@/lib/keep-form-values";
import { loginTenantAction, type LoginState } from "./actions";

const INITIAL: LoginState = { status: "idle", message: "" };

export function LoginForm({ rentLabel }: { rentLabel: string }) {
  const [state, action, pending] = useActionState(loginTenantAction, INITIAL);
  return (
    <form className="contact-form auth-form" action={action} onSubmit={keepValues(action)}>
      <div className="field">
        <label htmlFor="username">Username</label>
        <input id="username" name="username" type="text" autoComplete="username" autoCapitalize="none" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Logging in..." : "Log in"}
      </button>
      {state.status === "error" && (
        <p className="form-note error" role="alert">
          {state.message}
        </p>
      )}
      <div className="auth-links">
        <Link href="/username_recoveries/new">Forgot your username?</Link>
        <Link href="/pages/rent">{rentLabel}</Link>
      </div>
    </form>
  );
}
