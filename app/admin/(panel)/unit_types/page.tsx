import Image from "next/image";
import { connection } from "next/server";
import { Badge, DataTable, LinkButton, Notice, PageHeader } from "../../ui";
import { getRules, getUnitTypes } from "@/lib/content";

export default async function UnitTypesPage() {
  await connection();
  const [types, rules] = await Promise.all([getUnitTypes(), getRules()]);
  return (
    <>
      <PageHeader title="Unit Types" description="Sizes, monthly prices and what shows on the website's Rent page." />
      <Notice>
        Prices, descriptions and photos you save here update the Rent page. Availability is counted from your vacant units:
        a size with none shows <strong>Waiting List</strong>, and one with {rules.lowStockThreshold} or fewer shows <strong>Only N left!</strong>.
        Manage units under Units.
      </Notice>
      <DataTable
        columns={["Size", "Photo", "Units", "Vacant", "Pricing", "Description", "On website", "Actions"]}
        rows={types.map((type) => [
          <strong key="s">{type.name}</strong>,
          type.image ? <Image key="p" className="adm-thumb" src={type.image} alt="" width={54} height={54} /> : <span key="p" className="adm-stat-hint">No photo</span>,
          type.units,
          type.vacant,
          <span key="pr" style={{ whiteSpace: "nowrap" }}>{type.price} / 1 Month</span>,
          <span key="d" className="adm-clip">{type.description || "—"}</span>,
          type.onWebsite ? (
            <Badge key="w" tone={type.availability === "waiting" ? "amber" : "green"}>
              {type.availability === "waiting" ? "Waiting list" : type.note || "Rent now"}
            </Badge>
          ) : (
            <Badge key="w" tone="gray">Hidden</Badge>
          ),
          <LinkButton key="a" small icon="edit" href={`/admin/unit_types/${type.id}/edit`}>Edit</LinkButton>,
        ])}
        footer={`${types.length} unit types, ${types.filter((type) => type.onWebsite).length} shown on the website`}
      />
    </>
  );
}
