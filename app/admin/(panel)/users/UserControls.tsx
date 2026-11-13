"use client";

import { useActionState } from "react";
import { resetAdminPasswordAction, type ActionState } from "../../actions";

const INITIAL: ActionState = { status: "idle", message: "" };

// "Reset password" button that shows the new generated password right under it (once).
export function ResetPassword({ id, email }: { id: number; email: string }) {
  const [state, action, pending] = useActionState(resetAdminPasswordAction, INITIAL);
  return (
    <form
      action={action}
      style={{ display: "inline-block", textAlign: "left" }}
      onSubmit={(event) => {
        if (!window.confirm(`Reset the password for ${email}? Their current password will stop working.`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="adm-btn is-small" type="submit" disabled={pending}>
        {pending ? "Resetting..." : "Reset password"}
      </button>
      {state.status !== "idle" && (
        <div className={`adm-note ${state.status === "ok" ? "is-ok" : "is-err"}`} style={{ marginTop: 8, userSelect: "all" }}>
          <div>{state.message}</div>
        </div>
      )}
    </form>
  );
}
