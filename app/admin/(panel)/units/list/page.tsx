import { connection } from "next/server";
import { Badge, Card, DataTable, LinkButton, PageHeader } from "../../../ui";
import { formatCents, getUnitTypes } from "@/lib/content";
import { db, unwrap } from "@/lib/db";
import { STATUS_LABELS, STATUS_TONES } from "../UnitForm";

type Row = {
  id: number;
  name: string;
  status: keyof typeof STATUS_LABELS;
  unit_types: { name: string } | null;
  rentals: { ended_on: string | null; monthly_rent_cents: number; confirmed: boolean; customers: { full_name: string; phone: string } | null }[];
};

export default async function UnitsListPage({ searchParams }: PageProps<"/admin/units/list">) {
  await connection();
  const params = await searchParams;
  const status = typeof params.status === "string" && params.status in STATUS_LABELS ? params.status : "";
  const typeId = typeof params.type === "string" ? Number(params.type) : 0;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 40).replace(/[,()%*\\]/g, " ").trim();

  const types = await getUnitTypes();
  let query = db()
    .from("units")
    .select("id,name,status,unit_types(name),rentals(ended_on,monthly_rent_cents,confirmed,customers(full_name,phone))")
    .order("name")
    .limit(500);
  if (status) query = query.eq("status", status);
  if (typeId) query = query.eq("unit_type_id", typeId);
  if (q) query = query.ilike("name", `%${q}%`);
  const units = unwrap(await query, "units") as unknown as Row[];
  // Numeric unit numbers sort as numbers (2 before 10).
  units.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return (
    <>
      <PageHeader
        title="Units List"
        description="Every storage unit. Availability on the Rent page is counted from the vacant units."
        actions={
          <>
            <LinkButton icon="plus" href="/admin/units/mass_create">Create Multiple Units</LinkButton>
            <LinkButton primary icon="plus" href="/admin/units/new">New Unit</LinkButton>
          </>
        }
      />
      <Card>
        <form method="get" className="adm-filters">
          <div className="adm-field">
            <label htmlFor="q">Unit number</label>
            <input id="q" name="q" className="adm-input" defaultValue={q} />
          </div>
          <div className="adm-field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" className="adm-select" defaultValue={status}>
              <option value="">All</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="type">Unit type</label>
            <select id="type" name="type" className="adm-select" defaultValue={typeId || ""}>
              <option value="">All</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          <button className="adm-btn is-primary" type="submit" style={{ marginTop: 22 }}>Filter</button>
        </form>
      </Card>
      <DataTable
        columns={["Unit", "Status", "Unit Type", "Customer", "Rent", "Actions"]}
        empty="No units match. Add units with New Unit or Create Multiple Units."
        rows={units.map((unit) => {
          const rental = unit.rentals?.find((entry) => !entry.ended_on);
          return [
            <strong key="n">{unit.name}</strong>,
            <Badge key="s" tone={STATUS_TONES[unit.status]}>{STATUS_LABELS[unit.status]}</Badge>,
            unit.unit_types?.name ?? "",
            rental?.customers ? <span key="c">{rental.customers.full_name}{rental.confirmed === false && <> <Badge tone="amber">Pending</Badge></>}</span> : "",
            rental ? formatCents(rental.monthly_rent_cents) : "",
            <LinkButton key="a" small icon="edit" href={`/admin/units/${unit.id}/edit`}>Edit</LinkButton>,
          ];
        })}
        footer={`${units.length} units`}
      />
    </>
  );
}
