import { connection } from "next/server";
import { deleteEntityAction, saveEntityAction } from "./actions";
import { AdminForm, ConfirmButton } from "./AdminForm";
import { Card, DataTable, LinkButton, Notice, PageHeader } from "./ui";
import { ENTITIES, type EntityField, type Row } from "@/lib/admin/entities";
import { db, unwrap } from "@/lib/db";

function FieldInput({ field, value }: { field: EntityField; value: unknown }) {
  const id = `e-${field.name}`;
  if (field.kind === "check") {
    return (
      <label className="adm-check adm-field" htmlFor={id}>
        <input id={id} name={field.name} type="checkbox" defaultChecked={value === undefined ? true : Boolean(value)} />
        <span>{field.label}</span>
      </label>
    );
  }
  const shown =
    field.kind === "money" && value !== undefined ? (Number(value) / 100).toFixed(2) : value === undefined || value === null ? "" : String(value);
  return (
    <div className={`adm-field${field.wide ? " is-wide" : ""}`}>
      <label htmlFor={id}>{field.label}</label>
      {field.kind === "textarea" ? (
        <textarea id={id} name={field.name} className="adm-textarea is-code" style={{ minHeight: 220 }} defaultValue={shown} required={field.required} />
      ) : field.kind === "select" ? (
        <select id={id} name={field.name} className="adm-select" defaultValue={shown || field.options?.[0]?.[0]}>
          {field.options?.map(([option, label]) => (
            <option key={option} value={option}>{label}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={field.name}
          className="adm-input"
          type={field.kind === "date" ? "date" : "text"}
          inputMode={field.kind === "money" || field.kind === "percent" || field.kind === "number" ? "decimal" : undefined}
          defaultValue={shown}
          required={field.required}
          placeholder={field.placeholder}
          autoComplete="off"
        />
      )}
      {field.hint && <small>{field.hint}</small>}
    </div>
  );
}

// One page for a simple list: an add/edit form on top and the saved rows underneath.
export async function EntityManager({
  entityKey,
  edit,
  extra,
}: {
  entityKey: string;
  edit?: string;
  extra?: React.ReactNode;
}) {
  await connection();
  const config = ENTITIES[entityKey];
  const rows = unwrap(await db().from(config.table).select("*").order(config.orderBy), config.title) as Row[];
  const editing = edit ? rows.find((row) => String(row.id) === edit) : undefined;

  return (
    <>
      <PageHeader title={config.title} description={config.description} />
      {extra}
      <Card title={editing ? `Edit ${config.singular}` : `Add a ${config.singular}`}>
        <AdminForm
          key={editing ? String(editing.id) : "new"}
          action={saveEntityAction}
          submitLabel={editing ? "Save changes" : `Add ${config.singular}`}
          resetOnSuccess={!editing}
          extra={editing ? <LinkButton href={config.path}>Cancel</LinkButton> : undefined}
        >
          <input type="hidden" name="entity" value={config.key} />
          <input type="hidden" name="id" value={editing ? String(editing.id) : ""} />
          <div className="adm-fields">
            {config.fields.map((field) => (
              <FieldInput key={field.name} field={field} value={editing ? editing[field.name] : undefined} />
            ))}
          </div>
        </AdminForm>
      </Card>
      {rows.length === 0 && <Notice>{config.emptyText}</Notice>}
      <DataTable
        columns={[...config.columns, "Actions"]}
        empty={config.emptyText}
        rows={rows.map((row) => [
          ...config.display(row),
          <span key="a" style={{ display: "inline-flex", gap: 6 }}>
            <LinkButton small icon="edit" href={`${config.path}?edit=${row.id}`}>Edit</LinkButton>
            <ConfirmButton
              action={deleteEntityAction}
              fields={{ entity: config.key, id: String(row.id) }}
              message={`Delete this ${config.singular}?`}
            />
          </span>,
        ])}
        footer={`${rows.length} ${rows.length === 1 ? config.singular : `${config.singular}s`}`}
      />
    </>
  );
}
