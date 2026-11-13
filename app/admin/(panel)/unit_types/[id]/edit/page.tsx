import { notFound } from "next/navigation";
import { saveUnitTypeAction } from "../../../../actions";
import { AdminForm } from "../../../../AdminForm";
import { Card, LinkButton, Notice, PageHeader } from "../../../../ui";
import { getRules, getUnitTypes } from "@/lib/content";
import { listImages } from "@/lib/admin/images";

export default async function EditUnitTypePage({ params }: PageProps<"/admin/unit_types/[id]/edit">) {
  const { id } = await params;
  const [types, images, rules] = await Promise.all([getUnitTypes(), listImages(), getRules()]);
  const type = types.find((entry) => String(entry.id) === id);
  if (!type) notFound();
  const options = images.filter((image) => image.kind !== "Page image");
  const hasCurrent = options.some((image) => image.url === type.image);

  return (
    <>
      <PageHeader
        title="Edit Unit Type"
        description={type.name}
        actions={<LinkButton href="/admin/unit_types">Back to unit types</LinkButton>}
      />
      <Notice>
        {type.vacant === 0
          ? "No vacant units, so the Rent page shows the Waiting List button."
          : `${type.vacant} vacant ${type.vacant === 1 ? "unit" : "units"}, so the Rent page shows Rent Now${type.note ? ` with "${type.note}"` : ""}.`}{" "}
        Add or change units under Units. A size shows &quot;Only N left!&quot; when {rules.lowStockThreshold} or fewer are vacant.
      </Notice>
      <Card>
        <AdminForm action={saveUnitTypeAction}>
          <input type="hidden" name="id" value={type.id} />
          <div className="adm-fields">
            <div className="adm-field">
              <label htmlFor="f-name">Size</label>
              <input id="f-name" className="adm-input" value={type.name} readOnly />
            </div>
            <div className="adm-field">
              <label htmlFor="f-price">Monthly price</label>
              <input id="f-price" name="price" className="adm-input" defaultValue={type.price.replace("$", "")} inputMode="decimal" required />
              <small>Dollars per month, for example 115 or 115.00.</small>
            </div>
            <div className="adm-field is-wide">
              <label htmlFor="f-desc">Description</label>
              <textarea id="f-desc" name="description" className="adm-textarea" defaultValue={type.description} />
            </div>
            <div className="adm-field">
              <label htmlFor="f-image">Photo</label>
              <select id="f-image" name="image" className="adm-select" defaultValue={type.image}>
                {!hasCurrent && <option value={type.image}>{type.image || "No photo"}</option>}
                {options.map((image) => (
                  <option key={image.key} value={image.url}>{image.title || image.name} ({image.kind})</option>
                ))}
              </select>
              <small>Upload more images in Website &gt; Image Library.</small>
            </div>
            <div className="adm-field">
              <label htmlFor="f-units">Total units of this size</label>
              <input id="f-units" name="units" type="number" min="0" className="adm-input" defaultValue={type.units} />
              <small>Used for occupancy on the dashboard.</small>
            </div>
            <div className="adm-field">
              <label htmlFor="f-web">Show on the Rent page</label>
              <select id="f-web" name="onWebsite" className="adm-select" defaultValue={type.onWebsite ? "yes" : "no"}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        </AdminForm>
      </Card>
    </>
  );
}
