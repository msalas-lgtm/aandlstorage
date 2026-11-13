import { connection } from "next/server";
import { deleteImageAction, saveImageMetaAction, uploadImageAction } from "../../actions";
import { AdminForm, ConfirmButton } from "../../AdminForm";
import { Card, DataTable, PageHeader } from "../../ui";
import { listImages } from "@/lib/admin/images";

export default async function ImageLibraryPage() {
  await connection();
  const images = await listImages();
  return (
    <>
      <PageHeader title="Image Library" description="Images used on your pages and blog posts. Use the URL when you add an image to a blog post." />
      <Card title="Add an Image" subtitle="PNG, JPG, WebP or GIF, up to 5 MB.">
        <AdminForm action={uploadImageAction} submitLabel="Upload image" encType="multipart/form-data" resetOnSuccess>
          <div className="adm-fields">
            <div className="adm-field is-wide">
              <label htmlFor="f-file">Image</label>
              <input id="f-file" name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="adm-input" style={{ paddingTop: 9 }} required />
            </div>
            <div className="adm-field">
              <label htmlFor="f-title">Title</label>
              <input id="f-title" name="title" className="adm-input" />
            </div>
            <div className="adm-field">
              <label htmlFor="f-alt">Alt text</label>
              <input id="f-alt" name="alt" className="adm-input" />
              <small>Describe the image for people using screen readers and for search engines.</small>
            </div>
          </div>
        </AdminForm>
      </Card>
      <DataTable
        columns={["Image", "Location", "Size", "Title and alt text", "Actions"]}
        rows={images.map((image) => [
          // eslint-disable-next-line @next/next/no-img-element
          <img key="i" className="adm-thumb" src={image.url} alt={image.alt} loading="lazy" />,
          <div key="l">
            <code>{image.url}</code>
            <div className="adm-stat-hint">{image.kind}</div>
          </div>,
          `${Math.max(1, Math.round(image.bytes / 1024))} KB`,
          <div key="m" style={{ minWidth: 260 }}>
            <AdminForm action={saveImageMetaAction} submitLabel="Save">
              <input type="hidden" name="key" value={image.key} />
              <div className="adm-grid" style={{ gap: 8 }}>
                <input name="title" className="adm-input" placeholder="Title" defaultValue={image.title} aria-label={`Title for ${image.name}`} />
                <input name="alt" className="adm-input" placeholder="Alt text" defaultValue={image.alt} aria-label={`Alt text for ${image.name}`} />
              </div>
            </AdminForm>
          </div>,
          image.deletable ? (
            <ConfirmButton key="d" action={deleteImageAction} fields={{ name: image.name }} message={`Delete ${image.name}?`} />
          ) : (
            <span key="d" className="adm-stat-hint">In use</span>
          ),
        ])}
        footer={`${images.length} images`}
      />
    </>
  );
}
