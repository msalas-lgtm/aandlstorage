import { PortalPage, portalMetadata } from "@/app/components/PortalPage";
import { getRules, getSettings, telHref } from "@/lib/content";
import { ProfileForm } from "./ProfileForm";

export const metadata = portalMetadata("Edit Profile");

export default function EditProfilePage() {
  return (
    <PortalPage title="Edit Profile" active="/edit_profile">
      {async (tenant) => {
        const [rules, settings] = await Promise.all([getRules(), getSettings()]);
        return (
          <section className="pcard pcard-form">
            <h2 className="pcard-head">Edit Profile</h2>
            {rules.customersCanEditProfile ? (
              <ProfileForm username={tenant.username} email={tenant.email} textingConsent={tenant.textingConsent} />
            ) : (
              <div className="pcard-body">
                <p>
                  To change your profile, please call the office at <a href={telHref(settings.phone)}>{settings.phone}</a>.
                </p>
              </div>
            )}
          </section>
        );
      }}
    </PortalPage>
  );
}
