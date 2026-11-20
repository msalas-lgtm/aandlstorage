import "server-only";
import sanitizeHtml from "sanitize-html";

// Blog posts and page text are HTML written in the admin and shown to every visitor. This keeps the formatting
// (headings, paragraphs, lists, links, images) and removes anything that could run code: <script>, <iframe>,
// inline event handlers (onclick=...), style attributes, javascript: links and so on.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", "img", "strong", "b", "em", "i", "u",
    "s", "sub", "sup", "blockquote", "pre", "code", "span", "div", "center", "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel", "name"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    "*": ["class", "id"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] }, // no data: images
  allowProtocolRelative: false,
  transformTags: {
    a: (tag, attribs) => {
      const out = { ...attribs };
      if (out.target === "_blank") out.rel = "noopener noreferrer";
      else delete out.target;
      return { tagName: tag, attribs: out };
    },
    img: (tag, attribs) => ({ tagName: tag, attribs: { ...attribs, loading: "lazy" } }),
  },
  disallowedTagsMode: "discard",
};

export function cleanHtml(html: string | null | undefined): string {
  return sanitizeHtml(html ?? "", OPTIONS);
}
