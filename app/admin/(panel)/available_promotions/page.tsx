import { EntityManager } from "../../EntityManager";

export default async function PromotionsPage({ searchParams }: PageProps<"/admin/available_promotions">) {
  const { edit } = await searchParams;
  return <EntityManager entityKey="promotions" edit={typeof edit === "string" ? edit : undefined} />;
}
