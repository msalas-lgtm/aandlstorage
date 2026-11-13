import { connection } from "next/server";
import { setMessageStatusAction } from "../../actions";
import { Badge, DataTable, Notice, PageHeader } from "../../ui";
import { db, unwrap } from "@/lib/db";

type Message = { id: number; name: string; email: string; phone: string; message: string; status: "new" | "read" | "archived"; created_at: string };

function StatusButton({ id, status, label }: { id: number; status: string; label: string }) {
  return (
    <form action={setMessageStatusAction} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="adm-btn is-small" type="submit">{label}</button>
    </form>
  );
}

export default async function ContactMessagesPage() {
  await connection();
  const messages = unwrap(
    await db().from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200),
    "contact messages",
  ) as Message[];
  const unread = messages.filter((message) => message.status === "new").length;

  return (
    <>
      <PageHeader title="Messages" description="Messages sent from the contact form on your website." />
      <Notice>
        {unread} new {unread === 1 ? "message" : "messages"}. Messages are saved here even if email delivery isn&apos;t set up.
      </Notice>
      <DataTable
        columns={["From", "Message", "Received", "Status", "Actions"]}
        empty="No messages yet."
        rows={messages.map((message) => [
          <div key="f">
            <strong>{message.name}</strong>
            <div className="adm-stat-hint">{message.email}{message.phone ? ` · ${message.phone}` : ""}</div>
          </div>,
          <div key="m" style={{ maxWidth: 460, whiteSpace: "pre-wrap" }}>{message.message}</div>,
          new Date(message.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }),
          <Badge key="s" tone={message.status === "new" ? "red" : message.status === "read" ? "blue" : "gray"}>
            {message.status === "new" ? "New" : message.status === "read" ? "Read" : "Archived"}
          </Badge>,
          <span key="a">
            {message.status !== "read" && <StatusButton id={message.id} status="read" label="Mark read" />}
            {message.status !== "archived" && <StatusButton id={message.id} status="archived" label="Archive" />}
            {message.status === "archived" && <StatusButton id={message.id} status="new" label="Restore" />}
          </span>,
        ])}
        footer={`${messages.length} messages`}
      />
    </>
  );
}
