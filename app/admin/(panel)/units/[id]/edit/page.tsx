import { notFound } from "next/navigation";
import { deleteUnitAction } from "../../../../actions";
import { ConfirmButton } from "../../../../AdminForm";
import { Badge, Card, DataTable, LinkButton, Notice, PageHeader } from "../../../../ui";
import { formatCents, getUnitTypes } from "@/lib/content";
import { db } from "@/lib/db";
import { UnitForm, type UnitRow } from "../../UnitForm";

export default async function EditUnitPage({ params, searchParams }: PageProps<"/admin/units/[id]/edit">) {
  const { id } = await params;
  const { created } = await searchParams;
  const unitId = Number(id);
  if (!Number.isInteger(unitId)) notFound();

  const client = db();
  const { data: unit } = await client.from("units").select("*").eq("id", unitId).maybeSingle();
  if (!unit) notFound();
  const { data: rentals } = await client
    .from("rentals")
    .select("id,monthly_rent_cents,started_on,ended_on,confirmed,customer_id,customers(full_name)")
    .eq("unit_id", unitId)
    .order("started_on", { ascending: false });
  const types = await getUnitTypes();
  const active = (rentals ?? []).some((rental) => !rental.ended_on);

  return (
    <>
      <PageHeader title="Edit Unit" description={`Unit ${unit.name}`} actions={<LinkButton href="/admin/units/list">Back to units</LinkButton>} />
      {created && <Notice tone="ok">Unit created.</Notice>}
      <Card>
        <UnitForm unit={unit as UnitRow} types={types} />
      </Card>
      <Card title="Rental history">
        <DataTable
          columns={["Customer", "Monthly rent", "Started", "Status"]}
          empty="This unit has never been rented through the dashboard."
          rows={(rentals ?? []).map((rental) => [
            <a key="c" href={`/admin/customers/${rental.customer_id}/edit`}>{(rental.customers as unknown as { full_name: string } | null)?.full_name ?? "Customer"}</a>,
            formatCents(rental.monthly_rent_cents),
            rental.started_on,
            rental.ended_on ? <Badge key="s" tone="gray">Ended {rental.ended_on}</Badge> : rental.confirmed ? <Badge key="s" tone="green">Active</Badge> : <Badge key="s" tone="amber">Pending</Badge>,
          ])}
        />
      </Card>
      {!active && (
        <div>
          <ConfirmButton action={deleteUnitAction} fields={{ id: String(unit.id) }} label="Delete this unit" message={`Delete unit ${unit.name}?`} small={false} />
        </div>
      )}
    </>
  );
}
