import { connection } from "next/server";
import { Card, LinkButton, PageHeader } from "../../../ui";
import { getUnitTypes } from "@/lib/content";
import { UnitForm } from "../UnitForm";

export default async function NewUnitPage() {
  await connection();
  return (
    <>
      <PageHeader title="New Unit" actions={<LinkButton href="/admin/units/list">Back to units</LinkButton>} />
      <Card>
        <UnitForm types={await getUnitTypes()} />
      </Card>
    </>
  );
}
