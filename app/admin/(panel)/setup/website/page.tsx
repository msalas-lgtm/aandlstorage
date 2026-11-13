import { connection } from "next/server";
import { saveSettingsAction } from "../../../actions";
import { AdminForm } from "../../../AdminForm";
import { Card, Notice, PageHeader } from "../../../ui";
import { getSettings } from "@/lib/content";

const TIMES = ["12:00 AM", "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM"];

const SOCIAL: [string, string][] = [
  ["facebook", "Facebook URL"],
  ["twitter", "Twitter URL"],
  ["linkedin", "Linkedin URL"],
  ["instagram", "Instagram URL"],
  ["youtube", "YouTube URL"],
  ["yelp", "Yelp URL"],
  ["reviewUrl", "Review URL"],
];

export default async function WebsiteSettingsPage() {
  await connection();
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Website Settings" description="Contact details, links and office hours shown across your website." />
      <AdminForm action={saveSettingsAction} submitLabel="Update Settings">
        <input type="hidden" name="section" value="website" />
        <Card title="Header settings">
          <div className="adm-fields">
            <div className="adm-field">
              <label htmlFor="f-header-phone">Website Header Contact Phone</label>
              <input id="f-header-phone" name="headerPhone" className="adm-input" defaultValue={s.headerPhone} />
            </div>
            <div className="adm-field">
              <label htmlFor="f-login">Login button text</label>
              <input id="f-login" name="loginButtonText" className="adm-input" defaultValue={s.loginButtonText} />
            </div>
          </div>
        </Card>
        <Card title="Footer contact info">
          <div className="adm-fields">
            <div className="adm-field">
              <label htmlFor="f-email">Website Contact Email</label>
              <input id="f-email" name="email" type="email" className="adm-input" defaultValue={s.email} required />
            </div>
            <div className="adm-field">
              <label htmlFor="f-phone">Website Contact Phone</label>
              <input id="f-phone" name="phone" className="adm-input" defaultValue={s.phone} />
            </div>
            <div className="adm-field is-wide">
              <label htmlFor="f-street">Website Contact Address</label>
              <input id="f-street" name="street" className="adm-input" defaultValue={s.street} />
            </div>
            <div className="adm-field">
              <label htmlFor="f-city">Website Contact City</label>
              <input id="f-city" name="city" className="adm-input" defaultValue={s.city} />
            </div>
            <div className="adm-field">
              <label htmlFor="f-state">Website Contact State</label>
              <input id="f-state" name="state" className="adm-input" defaultValue={s.state} />
            </div>
            <div className="adm-field">
              <label htmlFor="f-zip">Website Contact Zip</label>
              <input id="f-zip" name="zip" className="adm-input" defaultValue={s.zip} />
            </div>
          </div>
        </Card>
        <Card title="Social media links">
          <div className="adm-fields">
            {SOCIAL.map(([name, label]) => (
              <div className="adm-field" key={name}>
                <label htmlFor={`f-${name}`}>{label}</label>
                <input id={`f-${name}`} name={name} type="url" className="adm-input" placeholder="https://" defaultValue={s[name as keyof typeof s] as string} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="Office hours" subtitle="Shown in the website footer.">
          <div className="adm-hours">
            {s.hours.map((row, i) => (
              <div className="adm-hours-row" key={row.day}>
                <strong>{row.day}</strong>
                <select name={`hours_${i}_status`} className="adm-select" defaultValue={row.status} aria-label={`${row.day} status`}>
                  <option>Open</option>
                  <option>Closed</option>
                </select>
                <select name={`hours_${i}_open`} className="adm-select" defaultValue={row.open} aria-label={`${row.day} opens`}>
                  {TIMES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <select name={`hours_${i}_close`} className="adm-select" defaultValue={row.close} aria-label={`${row.day} closes`}>
                  {TIMES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            ))}
          </div>
        </Card>
      </AdminForm>
      <Notice>
        Colors, fonts and navigation style follow the A&amp;L brand (navy and red) and are set in the site&apos;s code,
        so they aren&apos;t editable here.
      </Notice>
    </>
  );
}
