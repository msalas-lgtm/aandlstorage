import Link from "next/link";
import { connection } from "next/server";
import { completeTaskAction, deleteTaskAction, saveTaskAction } from "../../actions";
import { AdminForm, ConfirmButton } from "../../AdminForm";
import { Badge, Card, DataTable, PageHeader } from "../../ui";
import { db, unwrap } from "@/lib/db";

type Task = { id: number; title: string; description: string; due_on: string | null; assigned_to: string; recurrence: string; done_at: string | null };

const TABS = [
  ["due", "Due Tasks"],
  ["upcoming", "Upcoming Tasks"],
  ["recurring", "Recurring Tasks"],
  ["done", "Completed"],
] as const;

export default async function TasksPage({ searchParams }: PageProps<"/admin/tasks">) {
  await connection();
  const params = await searchParams;
  const tab = TABS.some(([value]) => value === params.tab) ? (params.tab as string) : "due";
  const today = new Date().toISOString().slice(0, 10);
  const tasks = unwrap(await db().from("tasks").select("*").order("due_on", { nullsFirst: true }).limit(500), "tasks") as Task[];

  const open = tasks.filter((task) => !task.done_at);
  const groups: Record<string, Task[]> = {
    due: open.filter((task) => !task.due_on || task.due_on <= today),
    upcoming: open.filter((task) => task.due_on && task.due_on > today),
    recurring: open.filter((task) => task.recurrence !== "none"),
    done: tasks.filter((task) => task.done_at).reverse().slice(0, 100),
  };
  const shown = groups[tab];

  return (
    <>
      <PageHeader title="Task Manager" description="Things the team needs to do. Repeating tasks create the next one when you complete them." />
      <div className="adm-actions">
        {TABS.map(([value, label]) => (
          <Link key={value} href={`/admin/tasks?tab=${value}`} className={`adm-btn${tab === value ? " is-primary" : ""}`}>
            {label} ({groups[value].length})
          </Link>
        ))}
      </div>
      <Card title="Create Task">
        <AdminForm action={saveTaskAction} submitLabel="Create Task" resetOnSuccess>
          <div className="adm-fields">
            <div className="adm-field">
              <label htmlFor="t-title">Name</label>
              <input id="t-title" name="title" className="adm-input" required autoComplete="off" />
            </div>
            <div className="adm-field">
              <label htmlFor="t-due">Due Date</label>
              <input id="t-due" name="dueOn" type="date" className="adm-input" defaultValue={today} />
            </div>
            <div className="adm-field">
              <label htmlFor="t-assigned">Assigned to</label>
              <input id="t-assigned" name="assignedTo" className="adm-input" autoComplete="off" />
            </div>
            <div className="adm-field">
              <label htmlFor="t-repeat">Repeats</label>
              <select id="t-repeat" name="recurrence" className="adm-select" defaultValue="none">
                <option value="none">Does not repeat</option>
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
              </select>
            </div>
            <div className="adm-field is-wide">
              <label htmlFor="t-desc">Description</label>
              <textarea id="t-desc" name="description" className="adm-textarea" />
            </div>
          </div>
        </AdminForm>
      </Card>
      <DataTable
        columns={["Task", "Description", "Due", "Assigned to", "Repeats", "Actions"]}
        empty={tab === "done" ? "No completed tasks yet." : "Nothing here. You're all caught up."}
        rows={shown.map((task) => [
          <strong key="t">{task.title}</strong>,
          <span key="d" className="adm-clip">{task.description}</span>,
          task.due_on ? (task.due_on < today && !task.done_at ? <Badge key="u" tone="red">{task.due_on}</Badge> : task.due_on) : "",
          task.assigned_to,
          task.recurrence === "none" ? "" : task.recurrence,
          <span key="a" style={{ display: "inline-flex", gap: 6 }}>
            {!task.done_at && (
              <form action={completeTaskAction} style={{ display: "inline" }}>
                <input type="hidden" name="id" value={task.id} />
                <button className="adm-btn is-small is-primary" type="submit">Complete</button>
              </form>
            )}
            <ConfirmButton action={deleteTaskAction} fields={{ id: String(task.id) }} message="Delete this task?" />
          </span>,
        ])}
        footer={`${shown.length} tasks`}
      />
    </>
  );
}
