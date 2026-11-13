"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

const LOAD_ERROR = "Sorry, the secure form couldn't load. Please try again or call the office.";
const DEFAULT_REFRESH = [1500, 5000, 12000];

// A popup that shows Stripe's own card form (for a payment, or for saving a card). The card form lives inside a
// Stripe frame, so card numbers never touch this site. Render it with a new `key` for every session.
export function StripeCheckoutDialog({
  clientSecret,
  publishableKey,
  title,
  doneTitle,
  doneText,
  refreshAfter = DEFAULT_REFRESH,
}: {
  clientSecret: string;
  publishableKey: string;
  title: string;
  doneTitle: string;
  doneText: string;
  // Stripe tells our server a moment after the customer finishes, so the page is refreshed a few times.
  refreshAfter?: number[];
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const mountPoint = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let checkout: { destroy: () => void } | null = null;
    let cancelled = false;
    dialog.current?.showModal();
    (async () => {
      const stripe = await loadStripe(publishableKey);
      if (cancelled) return;
      if (!stripe || !mountPoint.current) return setProblem(LOAD_ERROR);
      const instance = await stripe.createEmbeddedCheckoutPage({
        clientSecret,
        onComplete: () => {
          setDone(true);
          for (const wait of refreshAfter) setTimeout(() => router.refresh(), wait);
        },
      });
      if (cancelled) return instance.destroy();
      checkout = instance;
      instance.mount(mountPoint.current!);
    })().catch(() => !cancelled && setProblem(LOAD_ERROR));
    return () => {
      cancelled = true;
      checkout?.destroy();
    };
  }, [clientSecret, publishableKey, refreshAfter, router]);

  return (
    <dialog ref={dialog} className="pay-dialog" aria-label={title} onClose={() => router.refresh()}>
      <div className="pay-dialog-bar">
        <strong>{title}</strong>
        <button type="button" className="pay-dialog-close" onClick={() => dialog.current?.close()} aria-label="Close">
          &times;
        </button>
      </div>
      {done ? (
        <div className="pay-dialog-done">
          <h3>{doneTitle}</h3>
          <p>{doneText}</p>
          <button type="button" className="button primary" onClick={() => dialog.current?.close()}>
            Done
          </button>
        </div>
      ) : (
        <>
          {problem && <p className="form-note error">{problem}</p>}
          <div ref={mountPoint} className="pay-dialog-body" />
        </>
      )}
    </dialog>
  );
}
