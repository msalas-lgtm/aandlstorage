import Link from "next/link";
import { EntityManager } from "../../EntityManager";
import { Notice } from "../../ui";

export default async function LateLienPage({ searchParams }: PageProps<"/admin/past_due_rule_batches">) {
  const { edit } = await searchParams;
  return (
    <EntityManager
      entityKey="late_rules"
      edit={typeof edit === "string" ? edit : undefined}
      extra={
        <Notice>
          Rules are applied when you run <Link href="/admin/billing_run"><strong>Monthly Billing</strong></Link>. Each overdue
          charge gets each rule&apos;s fee once. Nothing is emailed or texted to the customer.
        </Notice>
      }
    />
  );
}
