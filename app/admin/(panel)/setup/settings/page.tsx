import { connection } from "next/server";
import { saveSettingsAction } from "../../../actions";
import { AdminForm } from "../../../AdminForm";
import { Card, PageHeader } from "../../../ui";
import { getRules } from "@/lib/content";

export default async function SettingsPage() {
  await connection();
  const rules = await getRules();
  return (
    <>
      <PageHeader title="Settings" description="Rules for online rentals and the customer pages. Changes apply to the website straight away." />
      <Card title="Online rentals and customer access">
        <AdminForm action={saveSettingsAction} submitLabel="Update Settings">
          <input type="hidden" name="section" value="rules" />
          <div className="adm-fields">
            <label className="adm-check adm-field is-wide" htmlFor="s-online">
              <input id="s-online" name="onlineRentals" type="checkbox" defaultChecked={rules.onlineRentals} />
              <span>Allow customers to rent a unit online (the &quot;Rent Now&quot; buttons)</span>
            </label>
            <label className="adm-check adm-field is-wide" htmlFor="s-edit">
              <input id="s-edit" name="customersCanEditProfile" type="checkbox" defaultChecked={rules.customersCanEditProfile} />
              <span>Customers can edit their own profile (username, email, text-message choice)</span>
            </label>
            <div className="adm-field">
              <label htmlFor="s-window">Move-in window (days)</label>
              <input id="s-window" name="moveInWindowDays" type="number" min="1" max="365" className="adm-input" defaultValue={rules.moveInWindowDays} />
              <small>How far ahead a customer can choose a move-in date when renting online.</small>
            </div>
            <div className="adm-field">
              <label htmlFor="s-low">Show &quot;Only N left!&quot; at</label>
              <input id="s-low" name="lowStockThreshold" type="number" min="0" max="50" className="adm-input" defaultValue={rules.lowStockThreshold} />
              <small>When this many units or fewer of a size are vacant. Use 0 to never show it.</small>
            </div>
          </div>
        </AdminForm>
      </Card>
    </>
  );
}
