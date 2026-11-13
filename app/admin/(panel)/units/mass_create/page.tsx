import { connection } from "next/server";
import { massCreateUnitsAction } from "../../../actions";
import { AdminForm } from "../../../AdminForm";
import { Card, LinkButton, PageHeader } from "../../../ui";
import { getUnitTypes } from "@/lib/content";
import { STATUS_LABELS } from "../UnitForm";

export default async function MassCreateUnitsPage() {
  await connection();
  const types = await getUnitTypes();
  return (
    <>
      <PageHeader
        title="Create Multiple Units"
        description="Add many units at once. Numbers that already exist are skipped."
        actions={<LinkButton href="/admin/units/list">Back to units</LinkButton>}
      />
      <Card>
        <AdminForm action={massCreateUnitsAction} submitLabel="Create units" resetOnSuccess>
          <div className="adm-fields">
            <div className="adm-field is-wide">
              <label htmlFor="f-names">Names</label>
              <textarea id="f-names" name="names" className="adm-textarea" placeholder={"101-120\nA5\nA6"} required />
              <small>One per line or separated by commas. Use a range like 101-120 for a run of numbers.</small>
            </div>
            <div className="adm-field">
              <label htmlFor="f-type">Unit Type</label>
              <select id="f-type" name="unitTypeId" className="adm-select" defaultValue="">
                <option value="">Not set</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
            <div className="adm-field">
              <label htmlFor="f-status">Status</label>
              <select id="f-status" name="status" className="adm-select" defaultValue="vacant">
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </AdminForm>
      </Card>
    </>
  );
}
