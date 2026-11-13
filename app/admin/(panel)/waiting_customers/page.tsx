import { connection } from "next/server";
import { setRequestStatusAction } from "../../actions";
import { Badge, DataTable, Notice, PageHeader } from "../../ui";
import { db, unwrap } from "@/lib/db";

type Entry = {
  id: number;
  unit_type_name: string;
  name: string;
  email: string;
  phone: string;
  requested_move_in: string | null;
  notes: string;
  status: "waiting" | "notified" | "removed";
  created_at: string;
};

const TONES = { waiting: "amber", notified: "blue", removed: "gray" } as const;
const LABELS = { waiting: "Waiting", notified: "Notified", removed: "Removed" } as const;

function StatusButton({ id, status, label }: { id: number; status: string; label: string }) {
  return (
    <form action={setRequestStatusAction} style={{ display: "inline" }}>
      <input type="hidden" name="table" value="waiting_list" />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="adm-btn is-small" type="submit">{label}</button>
    </form>
  );
}

export default async function WaitingListPage() {
  await connection();
  const entries = unwrap(
    await db().from("waiting_list").select("*").order("created_at", { ascending: false }).limit(200),
    "waiting list",
  ) as Entry[];
  const waiting = entries.filter((entry) => entry.status === "waiting").length;

  return (
    <>
      <PageHeader title="Waiting List" description='People who joined from the "Waiting List" buttons on your Rent page.' />
      <Notice>
        {waiting} {waiting === 1 ? "person is" : "people are"} waiting. Mark someone Notified once you&apos;ve told them a unit opened up.
      </Notice>
      <DataTable
        columns={["Name", "Contact", "Unit size", "Needed by", "Added", "Notes", "Status", "Actions"]}
        empty="Nobody is on the waiting list."
        rows={entries.map((entry) => [
          <strong key="n">{entry.name}</strong>,
          <div key="c">{entry.email}<div className="adm-stat-hint">{entry.phone}</div></div>,
          entry.unit_type_name,
          entry.requested_move_in ?? "",
          new Date(entry.created_at).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "America/New_York" }),
          <div key="t" style={{ maxWidth: 240, whiteSpace: "pre-wrap" }}>{entry.notes}</div>,
          <Badge key="s" tone={TONES[entry.status]}>{LABELS[entry.status]}</Badge>,
          <span key="a">
            {entry.status === "waiting" && <StatusButton id={entry.id} status="notified" label="Mark notified" />}
            {entry.status !== "removed" && <StatusButton id={entry.id} status="removed" label="Remove" />}
            {entry.status === "removed" && <StatusButton id={entry.id} status="waiting" label="Restore" />}
          </span>,
        ])}
        footer={`${entries.length} entries`}
      />
    </>
  );
}
