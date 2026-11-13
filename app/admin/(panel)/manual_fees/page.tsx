import { EntityManager } from "../../EntityManager";

export default async function ManualFeesPage({ searchParams }: PageProps<"/admin/manual_fees">) {
  const { edit } = await searchParams;
  return <EntityManager entityKey="fees" edit={typeof edit === "string" ? edit : undefined} />;
}
