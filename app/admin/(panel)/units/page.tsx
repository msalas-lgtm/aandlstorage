import Link from "next/link";
import { connection } from "next/server";
import { Badge, Card, LinkButton, PageHeader } from "../../ui";
import { getUnitTypes } from "@/lib/content";
import { db, unwrap } from "@/lib/db";
import { STATUS_LABELS } from "./UnitForm";

type Unit = { id: number; name: string; unit_type_id: number | null; status: keyof typeof STATUS_LABELS };

const CLASSES = { vacant: "vacant", reserved: "reserved", rented: "rented", unavailable: "late" } as const;

export default async function UnitsGridPage() {
  await connection();
  const types = await getUnitTypes();
  const units = unwrap(await db().from("units").select("id,name,unit_type_id,status").limit(1000), "units") as Unit[];
  units.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const groups = [
    ...types.map((type) => ({ key: String(type.id), title: type.name, units: units.filter((unit) => unit.unit_type_id === type.id), total: type.units })),
    { key: "none", title: "No unit type", units: units.filter((unit) => !unit.unit_type_id), total: 0 },
  ].filter((group) => group.units.length > 0 || group.total > 0);

  return (
    <>
      <PageHeader
        title="Units"
        description="Grid view of your units by unit type. Click a unit to edit it."
        actions={<LinkButton primary icon="plus" href="/admin/units/new">New Unit</LinkButton>}
      />
      <div className="adm-legend">
        <span><i style={{ background: "#fff", border: "1px dashed #c6d0e6" }} />Vacant</span>
        <span><i style={{ background: "#fff1da" }} />Reserved</span>
        <span><i style={{ background: "#e5f6ec" }} />Rented</span>
        <span><i style={{ background: "#ffe9ea" }} />Unavailable</span>
      </div>
      <div className="adm-unitgroups">
        {groups.map((group) => {
          const vacant = group.units.filter((unit) => unit.status === "vacant").length;
          return (
            <Card key={group.key} title={`${group.title} (${group.units.length} listed${group.total > group.units.length ? ` of ${group.total}` : ""})`} subtitle={`${vacant} vacant`}>
              {group.units.length === 0 ? (
                <p className="adm-stat-hint">No units listed yet. <Link href="/admin/units/mass_create">Create them</Link>.</p>
              ) : (
                <div className="adm-units">
                  {group.units.map((unit) => (
                    <Link key={unit.id} href={`/admin/units/${unit.id}/edit`} className={`adm-unit ${CLASSES[unit.status]}`} title={STATUS_LABELS[unit.status]}>
                      {unit.name}
                    </Link>
                  ))}
                </div>
              )}
              {vacant === 0 && group.units.length > 0 && <Badge tone="amber">Waiting list on the Rent page</Badge>}
            </Card>
          );
        })}
      </div>
    </>
  );
}
