import { saveUnitAction } from "../../actions";
import { AdminForm } from "../../AdminForm";
import type { UnitType } from "@/lib/content";

export type UnitRow = {
  id: number;
  name: string;
  unit_type_id: number | null;
  status: "vacant" | "reserved" | "rented" | "unavailable";
  gate_key: string;
  notes: string;
};

export const STATUS_LABELS = { vacant: "Vacant", reserved: "Reserved", rented: "Rented", unavailable: "Unavailable" } as const;
export const STATUS_TONES = { vacant: "green", reserved: "amber", rented: "blue", unavailable: "gray" } as const;

export function UnitForm({ unit, types }: { unit?: UnitRow; types: UnitType[] }) {
  return (
    <AdminForm action={saveUnitAction} submitLabel={unit ? "Save changes" : "Create unit"}>
      <input type="hidden" name="id" value={unit?.id ?? ""} />
      <div className="adm-fields">
        <div className="adm-field">
          <label htmlFor="f-name">Name or Number</label>
          <input id="f-name" name="name" className="adm-input" defaultValue={unit?.name} required autoComplete="off" />
        </div>
        <div className="adm-field">
          <label htmlFor="f-type">Unit type</label>
          <select id="f-type" name="unitTypeId" className="adm-select" defaultValue={unit?.unit_type_id ?? ""}>
            <option value="">Not set</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>
        <div className="adm-field">
          <label htmlFor="f-status">Status</label>
          <select id="f-status" name="status" className="adm-select" defaultValue={unit?.status ?? "vacant"}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <small>Only vacant units count as available on the Rent page.</small>
        </div>
        <div className="adm-field">
          <label htmlFor="f-gate">Gate Key</label>
          <input id="f-gate" name="gateKey" className="adm-input" defaultValue={unit?.gate_key} autoComplete="off" />
        </div>
        <div className="adm-field is-wide">
          <label htmlFor="f-notes">Notes</label>
          <textarea id="f-notes" name="notes" className="adm-textarea" defaultValue={unit?.notes} />
        </div>
      </div>
    </AdminForm>
  );
}
