import { startTransition, type FormEvent } from "react";

// React 19 clears a form's fields after its action runs, even when the action returned an error.
// Submitting through onSubmit keeps what the person typed, so a typo doesn't mean starting over.
// (Without JavaScript the form still submits normally through its action.)
export function keepValues(formAction: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };
}
