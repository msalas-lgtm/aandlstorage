import { PortalPage, portalMetadata } from "@/app/components/PortalPage";
import { PasswordForm } from "./PasswordForm";

export const metadata = portalMetadata("Change Password");

export default function ChangePasswordPage() {
  return (
    <PortalPage title="Change Password" active="/edit_profile">
      {() => (
        <section className="pcard pcard-form">
          <h2 className="pcard-head">Change Password</h2>
          <PasswordForm />
        </section>
      )}
    </PortalPage>
  );
}
