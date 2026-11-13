import { saveCustomerAction } from "../../actions";
import { AdminForm } from "../../AdminForm";

export type CustomerRow = {
  id: number;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  cell_phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  login_disabled: boolean;
  archived: boolean;
};

function Input({ id, label, value, type = "text", hint, required }: { id: string; label: string; value?: string; type?: string; hint?: string; required?: boolean }) {
  return (
    <div className="adm-field">
      <label htmlFor={`f-${id}`}>{label}</label>
      <input id={`f-${id}`} name={id} type={type} className="adm-input" defaultValue={value} required={required} autoComplete="off" />
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function CustomerForm({ customer }: { customer?: CustomerRow }) {
  return (
    <AdminForm action={saveCustomerAction} submitLabel={customer ? "Save changes" : "Create customer"}>
      <input type="hidden" name="id" value={customer?.id ?? ""} />
      <h3 className="adm-card-title">Contact information</h3>
      <div className="adm-fields">
        <Input id="fullName" label="Full Name" value={customer?.full_name} required />
        <Input id="email" label="Email" type="email" value={customer?.email} hint="Used to send the username if they forget it." />
        <Input id="phone" label="Phone" value={customer?.phone} />
        <Input id="cellPhone" label="Cell phone" value={customer?.cell_phone} />
        <div className="adm-field is-wide">
          <label htmlFor="f-address">Address</label>
          <input id="f-address" name="address" className="adm-input" defaultValue={customer?.address} />
        </div>
        <Input id="city" label="City" value={customer?.city} />
        <Input id="state" label="State" value={customer?.state} />
        <Input id="zip" label="Zip" value={customer?.zip} />
      </div>
      <h3 className="adm-card-title">Account &amp; access</h3>
      <div className="adm-fields">
        <Input id="username" label="Username" value={customer?.username} required hint="3 to 40 letters, numbers, dots, dashes or underscores. Lowercase." />
        <div className="adm-field">
          <label htmlFor="f-password">{customer ? "New password" : "Password"}</label>
          <input id="f-password" name="password" type="password" className="adm-input" autoComplete="new-password" required={!customer} />
          <small>{customer ? "Leave blank to keep the current password." : "At least 8 characters. Share it with the customer securely."}</small>
        </div>
        <div className="adm-field">
          <span className="adm-label">Access</span>
          <label className="adm-check" htmlFor="f-disabled">
            <input id="f-disabled" name="loginDisabled" type="checkbox" defaultChecked={customer?.login_disabled} />
            <span>Disable customer login</span>
          </label>
          <label className="adm-check" htmlFor="f-archived">
            <input id="f-archived" name="archived" type="checkbox" defaultChecked={customer?.archived} />
            <span>Archived (hide from the customer list)</span>
          </label>
        </div>
        <div className="adm-field is-wide">
          <label htmlFor="f-notes">Notes</label>
          <textarea id="f-notes" name="notes" className="adm-textarea" defaultValue={customer?.notes} />
          <small>Only visible to you.</small>
        </div>
      </div>
    </AdminForm>
  );
}
