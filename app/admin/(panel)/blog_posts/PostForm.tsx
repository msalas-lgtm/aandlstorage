import { savePostAction } from "../../actions";
import { AdminForm, PostBodyEditor } from "../../AdminForm";
import type { BlogPost } from "@/lib/content";

// "Published on 2/3/2022" -> "2022-02-03" for the date input.
function toInputDate(label: string | undefined) {
  const match = label?.match(/(\d+)\/(\d+)\/(\d{4})/);
  if (!match) return new Date().toISOString().slice(0, 10);
  return `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

export function PostForm({ post }: { post?: BlogPost }) {
  return (
    <AdminForm action={savePostAction} submitLabel={post ? "Save changes" : "Create post"}>
      <input type="hidden" name="originalSlug" value={post?.slug ?? ""} />
      <div className="adm-fields">
        <div className="adm-field is-wide">
          <label htmlFor="f-title">Title</label>
          <input id="f-title" name="title" className="adm-input" defaultValue={post?.title} required />
        </div>
        <div className="adm-field">
          <label htmlFor="f-slug">URL slug</label>
          <input
            id="f-slug"
            name="slug"
            className="adm-input"
            defaultValue={post?.slug}
            readOnly={Boolean(post)}
            required={!post}
            placeholder="how-to-pack-a-unit"
          />
          <small>
            {post
              ? "The URL is fixed so existing links and search rankings keep working."
              : "Letters, numbers and hyphens. This becomes /blog/your-slug and can't be changed later."}
          </small>
        </div>
        <div className="adm-field">
          <label htmlFor="f-date">Published</label>
          <input id="f-date" name="publishedOn" type="date" className="adm-input" defaultValue={toInputDate(post?.date)} required />
        </div>
        <div className="adm-field is-wide">
          <label htmlFor="f-meta-title">Meta title</label>
          <input id="f-meta-title" name="metaTitle" className="adm-input" defaultValue={post?.metaTitle} placeholder="A&L Self Storage: Your post title" />
        </div>
        <div className="adm-field is-wide">
          <label htmlFor="f-meta-desc">Meta description</label>
          <textarea id="f-meta-desc" name="metaDescription" className="adm-textarea" defaultValue={post?.metaDescription} />
        </div>
      </div>
      <PostBodyEditor initial={post?.html ?? "<p>Write your post here.</p>"} />
    </AdminForm>
  );
}
