import { connection } from "next/server";
import { saveSettingsAction } from "../../../actions";
import { AdminForm } from "../../../AdminForm";
import { Card, PageHeader } from "../../../ui";
import { getSettings } from "@/lib/content";

export default async function ContactSettingsPage() {
  await connection();
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Contact" description="Your facility's name, website address and physical address." />
      <Card title="General">
        <AdminForm action={saveSettingsAction} submitLabel="Update Settings">
          <input type="hidden" name="section" value="contact" />
          <div className="adm-fields">
            <div className="adm-field">
              <label htmlFor="f-name">Facility Name</label>
              <input id="f-name" name="facilityName" className="adm-input" defaultValue={s.facilityName} />
            </div>
            <div className="adm-field">
              <label htmlFor="f-site">Website address</label>
              <input id="f-site" name="websiteAddress" className="adm-input" defaultValue={s.websiteAddress} />
            </div>
            <div className="adm-field is-wide">
              <label htmlFor="f-street">Physical Address</label>
              <input id="f-street" name="street" className="adm-input" defaultValue={s.street} />
            </div>
            <div className="adm-field">
              <label htmlFor="f-city">Physical city</label>
              <input id="f-city" name="city" className="adm-input" defaultValue={s.city} />
              <small>Keep this the same city used in your page titles so Google sees one consistent location.</small>
            </div>
            <div className="adm-field">
              <label htmlFor="f-state">Physical state</label>
              <input id="f-state" name="state" className="adm-input" defaultValue={s.state} />
            </div>
            <div className="adm-field">
              <label htmlFor="f-zip">Physical zip</label>
              <input id="f-zip" name="zip" className="adm-input" defaultValue={s.zip} />
            </div>
            <div className="adm-field">
              <label htmlFor="f-phone">Phone</label>
              <input id="f-phone" name="phone" className="adm-input" defaultValue={s.phone} />
            </div>
          </div>
        </AdminForm>
      </Card>
    </>
  );
}
