"use client";

import Link from "next/link";
import { useActionState } from "react";
import { StripeCheckoutDialog } from "@/app/components/StripeCheckoutDialog";
import { keepValues } from "@/lib/keep-form-values";
import { proceedToPaymentAction, type PayState } from "./actions";

const INITIAL: PayState = { status: "idle", message: "" };

export function PayForm({ amountDue }: { amountDue: string }) {
  const [state, action, pending] = useActionState(proceedToPaymentAction, INITIAL);
  return (
    <>
      <form action={action} onSubmit={keepValues(action)}>
        <div className="pcard-body">
          <div className="field">
            <label htmlFor="amount">Amount</label>
            <div className="money-input">
              <span aria-hidden="true">$</span>
              <input id="amount" name="amount" type="number" step="0.01" min="0.01" inputMode="decimal" placeholder={amountDue} required />
            </div>
          </div>
          {state.message && (
            <p className={`form-note ${state.status === "error" ? "error" : "ok"}`} role="status">
              {state.message}
            </p>
          )}
        </div>
        <div className="pcard-foot pcard-foot-split">
          <button className="button primary" type="submit" disabled={pending}>
            {pending ? "One moment..." : "Proceed to Payment"}
          </button>
          <Link className="button navy" href="/statement/download" prefetch={false}>
            Download
          </Link>
        </div>
      </form>
      {state.status === "checkout" && state.clientSecret && state.publishableKey && (
        <StripeCheckoutDialog
          key={state.clientSecret}
          clientSecret={state.clientSecret}
          publishableKey={state.publishableKey}
          title="Secure payment"
          doneTitle="Thank you!"
          doneText="Your payment went through. It will show on your statement in a moment."
        />
      )}
    </>
  );
}
