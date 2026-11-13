import Link from "next/link";
import { connection } from "next/server";
import { Badge, DataTable, LinkButton, PageHeader } from "../../../ui";
import { db, unwrap } from "@/lib/db";
import { STATUS_LABELS, STATUS_TONES } from "../UnitForm";

type Row = { id: number; name: string; status: keyof typeof STATUS_LABELS; notes: string; unit_types: { name: string } | null };

export default async function UnitNotesPage() {
  await connection();
  const units = unwrap(
    await db().from("units").select("id,name,status,notes,unit_types(name)").neq("notes", "").limit(1000),
    "unit notes",
  ) as unknown as Row[];
  units.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return (
    <>
      <PageHeader title="Unit Notes" description="Every unit that has a note. Add or change a note on the unit's edit page." />
      <DataTable
        columns={["Unit", "Unit Type", "Status", "Note", "Actions"]}
        empty="No units have notes yet. Open a unit and add one in the Notes box."
        rows={units.map((unit) => [
          <strong key="n">{unit.name}</strong>,
          unit.unit_types?.name ?? "",
          <Badge key="s" tone={STATUS_TONES[unit.status]}>{STATUS_LABELS[unit.status]}</Badge>,
          <div key="t" style={{ maxWidth: 520, whiteSpace: "pre-wrap" }}>{unit.notes}</div>,
          <LinkButton key="a" small icon="edit" href={`/admin/units/${unit.id}/edit`}>Edit</LinkButton>,
        ])}
        footer={
          <span>
            {units.length} units with notes. <Link href="/admin/units/list">See all units</Link>
          </span>
        }
      />
    </>
  );
}
