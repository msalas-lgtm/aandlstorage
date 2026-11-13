import { connection } from "next/server";
import { saveSettingsAction } from "../../../actions";
import { AdminForm } from "../../../AdminForm";
import { Card, FieldControl, Notice, PageHeader } from "../../../ui";
import { getSettings } from "@/lib/content";

const EMAILED = [
  ["Credit Without Payment", false], ["Daily Failed Notification Summary", true], ["Daily Lock Out", true],
  ["Daily Signed Storage Agreements", false], ["Failed Recurring Billing", true], ["Lock Out Removal", true],
  ["Move Out Request", true], ["New Account Setup", true], ["New Rental", true], ["New Reservation", true],
  ["New Waiting List", true], ["Successful Payment", false],
] as const;

export default async function NotificationSettingsPage() {
  await connection();
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Communication Settings" description="Where notifications and website messages are sent." />
      <Card title="Email Settings" subtitle="The notifications email also receives messages from the website contact form.">
        <AdminForm action={saveSettingsAction} submitLabel="Update Settings">
          <input type="hidden" name="section" value="notifications" />
          <div className="adm-fields">
            <div className="adm-field">
              <label htmlFor="f-notify">Notifications email</label>
              <input id="f-notify" name="notificationsEmail" type="email" className="adm-input" defaultValue={s.notificationsEmail} required />
            </div>
            <div className="adm-field">
              <label htmlFor="f-reply">Reply to email</label>
              <input id="f-reply" name="replyToEmail" type="email" className="adm-input" defaultValue={s.replyToEmail} required />
            </div>
          </div>
        </AdminForm>
      </Card>
      <Notice>
        The list below shows which emails Storable sends. Those are managed in Storable, so the toggles are for
        reference only.
      </Notice>
      <Card title="Emailed Notifications">
        <div className="adm-fields">
          {EMAILED.map(([label, on], i) => (
            <FieldControl key={label} field={{ label, type: "checkbox", value: on ? "on" : "" }} name={`n-${i}`} disabled />
          ))}
        </div>
      </Card>
    </>
  );
}
