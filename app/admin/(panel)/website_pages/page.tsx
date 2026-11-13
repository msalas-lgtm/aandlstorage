import { connection } from "next/server";
import Link from "next/link";
import { Badge, DataTable, LinkButton, Notice, PageHeader } from "../../ui";
import { getPages } from "@/lib/content";

const SLUG = (path: string) => (path === "/" ? "home" : path.replace("/pages/", ""));

export default async function WebsitePagesPage() {
  await connection();
  const pages = await getPages();
  return (
    <>
      <PageHeader title="Pages" description="The pages on your website. Titles and descriptions are what Google shows in search results." />
      <Notice>
        Page URLs can&apos;t be changed here. Changing a URL would break links and rankings that already point to it.
      </Notice>
      <DataTable
        columns={["Title", "URL", "Menu label", "Menu", "Actions"]}
        rows={pages.map((page) => [
          <span key="t" className="adm-clip" style={{ fontWeight: 650 }}>{page.title}</span>,
          <code key="u">{page.path}</code>,
          page.tabName ?? "",
          page.tabVisible === false ? <Badge key="m" tone="gray">Hidden</Badge> : <Badge key="m" tone="green">Shown</Badge>,
          <span key="a">
            <Link className="adm-btn is-small" href={page.path} target="_blank">View</Link>
            <LinkButton small icon="edit" href={`/admin/website_pages/${SLUG(page.path)}/edit`}>Edit</LinkButton>
          </span>,
        ])}
        footer={`${pages.length} pages`}
      />
    </>
  );
}
