import { notFound } from "next/navigation";
import { savePageAction } from "../../../../actions";
import { AdminForm } from "../../../../AdminForm";
import { Card, LinkButton, PageHeader } from "../../../../ui";
import defaults from "@/content/rent-page-content.json";
import { getPages } from "@/lib/content";

export default async function EditPagePage({ params }: PageProps<"/admin/website_pages/[page]/edit">) {
  const { page: slug } = await params;
  const path = slug === "home" ? "/" : `/pages/${slug}`;
  const page = (await getPages()).find((entry) => entry.path === path);
  if (!page) notFound();
  const isRent = path === "/pages/rent";
  const text = { ...defaults, ...(page.content as Partial<typeof defaults>) };

  return (
    <>
      <PageHeader
        title="Edit Page"
        description={page.tabName}
        actions={<LinkButton href="/admin/website_pages">Back to pages</LinkButton>}
      />
      <Card>
        <AdminForm action={savePageAction}>
          <input type="hidden" name="path" value={page.path} />
          <div className="adm-fields">
            <div className="adm-field is-wide">
              <label htmlFor="f-title">Page title</label>
              <input id="f-title" name="title" className="adm-input" defaultValue={page.title} required />
              <small>Shown in the browser tab and in Google results.</small>
            </div>
            <div className="adm-field is-wide">
              <label htmlFor="f-slug">URL</label>
              <input id="f-slug" className="adm-input" value={page.path} readOnly />
              <small>The URL is fixed so existing links and search rankings keep working.</small>
            </div>
            <div className="adm-field is-wide">
              <label htmlFor="f-description">Meta description</label>
              <textarea id="f-description" name="description" className="adm-textarea" defaultValue={page.description} />
              <small>About 150 characters works best.</small>
            </div>
            <div className="adm-field">
              <label htmlFor="f-tab">Menu label</label>
              <input id="f-tab" name="tabName" className="adm-input" defaultValue={page.tabName} />
            </div>
            <div className="adm-field">
              <label htmlFor="f-visible">Menu</label>
              <select id="f-visible" name="tabVisible" className="adm-select" defaultValue={page.tabVisible === false ? "hide" : "show"}>
                <option value="show">Show in menu</option>
                <option value="hide">Hide from menu</option>
              </select>
            </div>
            {isRent && (
              <>
                <div className="adm-field">
                  <label htmlFor="f-footer">Footer link text</label>
                  <input id="f-footer" name="footerLinkText" className="adm-input" defaultValue={page.footerLinkText} />
                </div>
                <div className="adm-field">
                  <label htmlFor="f-login">Login page link text</label>
                  <input id="f-login" name="loginLinkText" className="adm-input" defaultValue={page.loginLinkText} />
                </div>
                <div className="adm-field is-wide">
                  <h3 className="adm-card-title" style={{ marginTop: 10 }}>Rent page text</h3>
                  <small>
                    These blocks appear on the Rent page. Unit sizes, prices, photos and availability come from Units &gt;
                    Unit Types and your units. Basic HTML (links, bold, italics) is allowed where noted.
                  </small>
                </div>
                <div className="adm-field is-wide">
                  <label htmlFor="c-banner">Banner title</label>
                  <input id="c-banner" name="c_bannerTitle" className="adm-input" defaultValue={text.bannerTitle} />
                </div>
                <div className="adm-field is-wide">
                  <label htmlFor="c-steps">Steps</label>
                  <textarea id="c-steps" name="c_steps" className="adm-textarea" defaultValue={text.steps.join("\n")} />
                  <small>One step per line.</small>
                </div>
                <div className="adm-field is-wide">
                  <label htmlFor="c-heading">Main heading</label>
                  <input id="c-heading" name="c_heading" className="adm-input" defaultValue={text.heading} />
                </div>
                <div className="adm-field is-wide">
                  <label htmlFor="c-intro">Intro paragraph (HTML)</label>
                  <textarea id="c-intro" name="c_introHtml" className="adm-textarea" defaultValue={text.introHtml} />
                </div>
                <div className="adm-field is-wide">
                  <label htmlFor="c-why-heading">&quot;Why rent&quot; heading</label>
                  <input id="c-why-heading" name="c_whyHeading" className="adm-input" defaultValue={text.whyHeading} />
                </div>
                {[0, 1, 2].map((i) => (
                  <div className="adm-field is-wide" key={i}>
                    <label htmlFor={`c-why-${i}`}>&quot;Why rent&quot; block {i + 1}</label>
                    <input id={`c-why-${i}`} name={`c_why_${i}_title`} className="adm-input" placeholder="Title" defaultValue={text.why[i]?.title ?? ""} />
                    <textarea name={`c_why_${i}_html`} className="adm-textarea" placeholder="Text (HTML)" defaultValue={text.why[i]?.html ?? ""} aria-label={`Text for block ${i + 1}`} />
                  </div>
                ))}
              </>
            )}
          </div>
        </AdminForm>
      </Card>
    </>
  );
}
