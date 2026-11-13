import { redirect } from "next/navigation";

// The customer dashboard lives at /dashboard (the same address as the live site).
export default function AccountRedirect() {
  redirect("/dashboard");
}
