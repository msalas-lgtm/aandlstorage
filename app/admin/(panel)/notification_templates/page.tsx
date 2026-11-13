import { EntityManager } from "../../EntityManager";

export default async function TemplatesPage({ searchParams }: PageProps<"/admin/notification_templates">) {
  const { edit } = await searchParams;
  return <EntityManager entityKey="letter_templates" edit={typeof edit === "string" ? edit : undefined} />;
}
