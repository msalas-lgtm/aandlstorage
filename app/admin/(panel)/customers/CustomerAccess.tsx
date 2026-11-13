"use client";

import { useActionState } from "react";
import { setCustomerAccessAction, type ActionState } from "../../actions";

const INITIAL: ActionState = { status: "idle", message: "" };

// "Set up online access" button: generates a password and shows it right under the button (once).
export function CustomerAccess({ id, name }: { id: number; name: string }) {
  const [state, action, pending] = useActionState(setCustomerAccessAction, INITIAL);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Create a new password for ${name} and turn their login on? Nothing is emailed to them.`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="adm-btn" type="submit" disabled={pending}>
        {pending ? "Working..." : "Set up online access (generate password)"}
      </button>
      {state.status !== "idle" && (
        <div className={`adm-note ${state.status === "ok" ? "is-ok" : "is-err"}`} style={{ marginTop: 10, userSelect: "all" }}>
          <div>{state.message}</div>
        </div>
      )}
    </form>
  );
}
