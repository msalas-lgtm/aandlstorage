"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { keepValues } from "@/lib/keep-form-values";
import type { ActionState } from "./actions";
import { AdminIcon } from "./AdminIcon";

const INITIAL: ActionState = { status: "idle", message: "" };

// <form> that runs a server action and shows its result (saved / error) under the buttons.
export function AdminForm({
  action,
  children,
  submitLabel = "Save changes",
  extra,
  encType,
  resetOnSuccess,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
  extra?: ReactNode;
  encType?: "multipart/form-data";
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state.status === "ok") formRef.current?.reset();
  }, [resetOnSuccess, state]);
  return (
    <form ref={formRef} className="adm-form" action={formAction} onSubmit={keepValues(formAction)} encType={encType}>
      {children}
      <div className="adm-formbar">
        <button className="adm-btn is-primary" type="submit" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </button>
        {extra}
      </div>
      {state.status !== "idle" && state.message && (
        <div className={`adm-note ${state.status === "ok" ? "is-ok" : "is-err"}`} role="status">
          <AdminIcon name={state.status === "ok" ? "check" : "info"} size={18} />
          <div>{state.message}</div>
        </div>
      )}
    </form>
  );
}

// Delete button that asks first. Pass the server action that performs the delete.
export function ConfirmButton({
  action,
  fields,
  label = "Delete",
  message,
  small = true,
}: {
  action: (data: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  label?: string;
  message: string;
  small?: boolean;
}) {
  return (
    <form
      action={action}
      style={{ display: "inline" }}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button className={`adm-btn is-danger${small ? " is-small" : ""}`} type="submit">
        <AdminIcon name="trash" size={14} />
        {label}
      </button>
    </form>
  );
}

// Body editor with a live preview next to the HTML.
export function PostBodyEditor({ initial }: { initial: string }) {
  const [html, setHtml] = useState(initial);
  return (
    <div className="adm-grid cols-2">
      <div className="adm-field">
        <label htmlFor="f-html">Body (HTML)</label>
        <textarea
          id="f-html"
          name="html"
          className="adm-textarea is-code"
          value={html}
          onChange={(event) => setHtml(event.target.value)}
          spellCheck={false}
          required
        />
        <small>Use headings, paragraphs, lists and images. The public page keeps the live site&apos;s styling.</small>
      </div>
      <div className="adm-field">
        <span className="adm-label">Preview</span>
        <div className="adm-preview" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
