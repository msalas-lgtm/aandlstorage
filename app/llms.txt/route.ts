import { getPages, getPosts, getSettings, getUnitTypes } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

// /llms.txt: a plain-text summary of the site for AI assistants and answer engines (ChatGPT, Claude, Perplexity,
// Google AI Overviews). It is built from the same live data as the pages (settings, unit types, posts), so it never
// goes out of date and never says anything the website doesn't.
export async function GET() {
  const [settings, units, posts, pages] = await Promise.all([getSettings(), getUnitTypes(), getPosts(), getPages()]);

  const open = settings.hours.filter((row) => row.status === "Open");
  const closed = settings.hours.filter((row) => row.status !== "Open").map((row) => row.day);
  const hours = open.length
    ? `${open.map((row) => `${row.day} ${row.open} - ${row.close}`).join("; ")}${closed.length ? `; closed ${closed.join(", ")}` : ""}`
    : "Call the office for hours";

  const lines: string[] = [
    "# A&L Self Storage",
    "",
    `> Self storage facility at ${settings.street}, ${settings.city}, ${settings.state} ${settings.zip} (near Poughkeepsie, Dutchess County, NY). Drive-up access, digital video surveillance, onsite security, 24-hour access, online bill pay, boxes and supplies, and a variety of unit sizes. Units can be reserved and rented online.`,
    "",
    "## Contact and hours",
    `- Address: ${settings.street}, ${settings.city}, ${settings.state} ${settings.zip}`,
    `- Phone: ${settings.phone}`,
    `- Office hours: ${hours}`,
    `- Website: ${SITE_URL}/`,
    "",
    "## Unit sizes and monthly prices",
    ...units
      .filter((unit) => unit.onWebsite)
      .map((unit) => `- ${unit.name}: ${unit.price.replace(/\.00$/, "")} per month, ${unit.availability === "rent" ? "available to rent online" : "waiting list"}. ${unit.description}`.trim()),
    "",
    "## Main pages",
    ...pages
      .filter((page) => page.tabVisible)
      .map((page) => `- [${page.tabName || page.title}](${SITE_URL}${page.path === "/" ? "/" : page.path}): ${page.description}`),
    "",
    "## Blog (storage tips)",
    ...posts.map((post) => `- [${post.title}](${SITE_URL}/blog/${post.slug}): ${post.metaDescription}`),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}
