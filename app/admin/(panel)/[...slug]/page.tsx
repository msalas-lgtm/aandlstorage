import { notFound } from "next/navigation";
import { GenericPage } from "../../GenericPage";
import { SPECS } from "@/lib/admin/specs";

// Preview pages that mirror the live admin's layout and fields (see lib/admin/specs.ts).
export default async function AdminGenericPage({ params }: PageProps<"/admin/[...slug]">) {
  const { slug } = await params;
  const spec = SPECS[`/${slug.join("/")}`];
  if (!spec) notFound();
  return <GenericPage spec={spec} />;
}
