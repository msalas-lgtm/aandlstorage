"use client";

import { useActionState } from "react";
import { StripeCheckoutDialog } from "@/app/components/StripeCheckoutDialog";
import { removePaymentAccountAction, setAutopayEnabledAction, startAutopaySetupAction, type AutopayState } from "./actions";

const INITIAL: AutopayState = { status: "idle", message: "" };

export function AutopayControls({ hasCard, enabled }: { hasCard: boolean; enabled: boolean }) {
  const [state, start, pending] = useActionState(startAutopaySetupAction, INITIAL);
  return (
    <>
      {state.message && (
        <p className={`form-note ${state.status === "error" ? "error" : "ok"}`} role="status">
          {state.message}
        </p>
      )}
      <div className="pcard-foot pcard-foot-split">
        <form action={start}>
          <button className="button primary" type="submit" disabled={pending}>
            {pending ? "One moment..." : hasCard ? "Replace Card" : "Add Payment Account"}
          </button>
        </form>
        {hasCard && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <form action={setAutopayEnabledAction}>
              <input type="hidden" name="enabled" value={enabled ? "no" : "yes"} />
              <button className="button outline" type="submit">
                {enabled ? "Turn Off Automatic Payments" : "Turn On Automatic Payments"}
              </button>
            </form>
            <form action={removePaymentAccountAction}>
              <button className="button outline" type="submit">
                Remove Card
              </button>
            </form>
          </div>
        )}
      </div>
      {state.status === "checkout" && state.clientSecret && state.publishableKey && (
        <StripeCheckoutDialog
          key={state.clientSecret}
          clientSecret={state.clientSecret}
          publishableKey={state.publishableKey}
          title="Save a card"
          doneTitle="Card saved"
          doneText="Your card is saved and automatic payments are on. This page will update in a moment."
        />
      )}
    </>
  );
}
