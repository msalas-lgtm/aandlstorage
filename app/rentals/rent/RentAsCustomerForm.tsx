"use client";

import { useActionState } from "react";
import { keepValues } from "@/lib/keep-form-values";
import { rentAsCustomerAction, type RentState } from "./actions";

const INITIAL: RentState = { status: "idle", message: "" };

// Only the move-in date: the customer is already signed in, so no name, username or password.
export function RentAsCustomerForm({ unitTypeId, minDate, maxDate }: { unitTypeId: number; minDate: string; maxDate: string }) {
  const [state, action, pending] = useActionState(rentAsCustomerAction, INITIAL);
  return (
    <form className="contact-form" action={action} onSubmit={keepValues(action)}>
      <input type="hidden" name="unitTypeId" value={unitTypeId} />
      <div className="field">
        <label htmlFor="moveIn">Move-in date</label>
        <input id="moveIn" name="moveIn" type="date" min={minDate} max={maxDate} defaultValue={minDate} required />
      </div>
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
