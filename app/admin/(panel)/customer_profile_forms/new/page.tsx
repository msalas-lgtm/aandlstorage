import { connection } from "next/server";
import { Card, LinkButton, PageHeader } from "../../../ui";
import { CustomerForm } from "../../customers/CustomerForm";

export default async function NewCustomerPage() {
  await connection();
  return (
    <>
      <PageHeader title="New Customer" actions={<LinkButton href="/admin/customers">Back to customers</LinkButton>} />
      <Card>
        <CustomerForm />
      </Card>
    </>
  );
}
