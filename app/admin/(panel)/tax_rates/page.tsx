import { EntityManager } from "../../EntityManager";

export default async function TaxRatesPage({ searchParams }: PageProps<"/admin/tax_rates">) {
  const { edit } = await searchParams;
  return <EntityManager entityKey="tax_rates" edit={typeof edit === "string" ? edit : undefined} />;
}
