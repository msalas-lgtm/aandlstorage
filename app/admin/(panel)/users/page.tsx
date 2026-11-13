import { connection } from "next/server";
import { createAdminUserAction, deleteAdminUserAction, setAdminUserDisabledAction } from "../../actions";
import { AdminForm, ConfirmButton } from "../../AdminForm";
import { Badge, Card, DataTable, Notice, PageHeader } from "../../ui";
import { currentAdmin } from "@/lib/admin/auth";
import { db, unwrap } from "@/lib/db";
import { ResetPassword } from "./UserControls";

type AdminUser = { id: number; email: string; name: string; disabled: boolean; created_at: string; last_login_at: string | null };

const when = (value: string | null) =>
  value ? new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }) : "Never";

export default async function UsersPage() {
  await connection();
  const [me, users] = await Promise.all([
    currentAdmin(),
    db().from("admin_users").select("*").order("created_at").then((result) => unwrap(result, "admin users") as AdminUser[]),
  ]);

  return (
    <>
      <PageHeader title="Users & Roles" description="People who can sign in to this admin dashboard. Everyone has full access." />
      <Notice>
        The <strong>owner</strong> login (email <code>owner</code> and the password in your .env.local) always works as a backup.
        Give each person their own account instead of sharing it.
      </Notice>
      <Card title="Add an admin" subtitle="A password is generated and shown once. Send it to them securely and ask them to keep it private.">
        <AdminForm action={createAdminUserAction} submitLabel="Create account and generate password" resetOnSuccess>
          <div className="adm-fields">
            <div className="adm-field">
              <label htmlFor="f-email">Email</label>
              <input id="f-email" name="email" type="email" className="adm-input" required autoComplete="off" />
            </div>
            <div className="adm-field">
              <label htmlFor="f-name">Name</label>
              <input id="f-name" name="name" className="adm-input" autoComplete="off" />
            </div>
          </div>
        </AdminForm>
      </Card>
      <DataTable
        columns={["Name", "Email", "Created", "Last sign-in", "Status", "Actions"]}
        empty="No admin accounts yet. Add one above."
        rows={users.map((user) => [
          <strong key="n">{user.name || "—"}{me?.id === user.id && <> <Badge tone="blue">You</Badge></>}</strong>,
          user.email,
          when(user.created_at),
          when(user.last_login_at),
          user.disabled ? <Badge key="s" tone="gray">Disabled</Badge> : <Badge key="s" tone="green">Active</Badge>,
          <span key="a" style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "flex-start" }}>
            <ResetPassword id={user.id} email={user.email} />
            <form action={setAdminUserDisabledAction} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={user.id} />
              <input type="hidden" name="disabled" value={user.disabled ? "no" : "yes"} />
              <button className="adm-btn is-small" type="submit" disabled={me?.id === user.id}>{user.disabled ? "Enable" : "Disable"}</button>
            </form>
            {me?.id !== user.id && (
              <ConfirmButton action={deleteAdminUserAction} fields={{ id: String(user.id) }} message={`Delete the account for ${user.email}?`} />
            )}
          </span>,
        ])}
        footer={`${users.length} admin ${users.length === 1 ? "account" : "accounts"}`}
      />
    </>
  );
}
