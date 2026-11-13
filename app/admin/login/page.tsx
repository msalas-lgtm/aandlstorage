import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="adm adm-login">
      <div className="adm-login-art">
        <h2>Run the website from one place.</h2>
        <p>Edit pages, blog posts, unit prices, hours and contact details for A&amp;L Self Storage.</p>
      </div>
      <div className="adm-login-panel">
        <div className="adm-login-box">
          <Image src="/assets/logo.png" alt="A&L Self Storage" width={453} height={270} priority />
          <div>
            <h1>Admin sign in</h1>
            <p>Sign in with your email and password.</p>
          </div>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
