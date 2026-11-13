"use client";

import { useActionState } from "react";
import { keepValues } from "@/lib/keep-form-values";
import { sendContactMessage, type ContactState } from "./actions";

const INITIAL: ContactState = { status: "idle", message: "" };

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContactMessage, INITIAL);

  return (
    <form className="contact-form" action={action} onSubmit={keepValues(action)}>
      {/* Spam trap: real visitors never see or fill this field. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Enter your name"
          required
          autoComplete="name"
        />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email address"
          required
          autoComplete="email"
        />
      </div>
      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          name="phone"
          type="text"
          placeholder="Phone Number (optional)"
          autoComplete="tel"
        />
      </div>
      <div className="field">
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          rows={6}
          placeholder="How can we help you?"
          required
        />
      </div>
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send Message"}
      </button>
      {state.status !== "idle" && state.message && (
        <p
          className={state.status === "success" ? "form-note ok" : "form-note error"}
          role="status"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
