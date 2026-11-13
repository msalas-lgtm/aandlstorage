import { connection } from "next/server";
import { importCustomersAction } from "../../actions";
import { AdminForm } from "../../AdminForm";
import { Card, Notice, PageHeader } from "../../ui";

export default async function ImportCustomersPage() {
  await connection();
  return (
    <>
      <PageHeader title="Import Customers From CSV" description="Add many customers at once from a spreadsheet." />
      <Notice>
        Imported customers have their online login switched off and no password, and <strong>no email or text is sent</strong>.
        Turn on a customer&apos;s access later from their page. Customers whose email already exists are skipped.
      </Notice>
      <Card title="Start New Import" subtitle="The first row must be headings. Only Name is required.">
        <AdminForm action={importCustomersAction} submitLabel="Import" resetOnSuccess encType="multipart/form-data">
          <div className="adm-fields">
            <div className="adm-field is-wide">
              <label htmlFor="i-file">Choose a file</label>
              <input id="i-file" name="file" type="file" accept=".csv,text/csv" className="adm-input" style={{ paddingTop: 9 }} />
            </div>
            <div className="adm-field is-wide">
              <label htmlFor="i-csv">Or paste the rows</label>
              <textarea id="i-csv" name="csv" className="adm-textarea is-code" style={{ minHeight: 160 }} placeholder={"Name,Email,Phone,Cell,Address,City,State,Zip\nJane Smith,jane@example.com,(845) 555-0100,,12 Main St,Poughkeepsie,NY,12601"} />
              <small>Headings it understands: Name, Email, Phone, Cell, Address, City, State, Zip.</small>
            </div>
          </div>
        </AdminForm>
      </Card>
    </>
  );
}
