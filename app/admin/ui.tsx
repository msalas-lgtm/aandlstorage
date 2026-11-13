import Link from "next/link";
import type { ReactNode } from "react";
import type { Cell } from "@/lib/admin/sample";
import type { Field } from "@/lib/admin/specs";
import { AdminIcon, type AdminIconName } from "./AdminIcon";

// Presentational building blocks shared by every admin page (no state, safe in server components).

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="adm-head">
      <div>
        <h1 className="adm-h1">{title}</h1>
        {description && <p className="adm-sub">{description}</p>}
      </div>
      {actions && <div className="adm-actions">{actions}</div>}
    </div>
  );
}

export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "ok" | "err";
}) {
  return (
    <div className={`adm-note${tone === "ok" ? " is-ok" : tone === "err" ? " is-err" : ""}`} role={tone === "err" ? "alert" : "status"}>
      <AdminIcon name={tone === "ok" ? "check" : "info"} size={18} />
      <div>{children}</div>
    </div>
  );
}

export function PreviewNotice() {
  return (
    <Notice>
      <strong>Preview page.</strong> This screen shows the same layout and fields as the live admin, with
      sample data. These tools run on Storable&apos;s platform, so nothing here is saved.
    </Notice>
  );
}

export function Card({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="adm-card">
      {title && <h2 className="adm-card-title">{title}</h2>}
      {subtitle && <p className="adm-card-sub">{subtitle}</p>}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: AdminIconName;
  tone?: "red" | "green" | "amber";
  delta?: { value: string; up: boolean };
}) {
  return (
    <div className="adm-card adm-stat">
      <div className="adm-stat-top">
        {label}
        {icon && (
          <span className={`adm-stat-ico${tone ? ` is-${tone}` : ""}`}>
            <AdminIcon name={icon} size={17} />
          </span>
        )}
      </div>
      <div className="adm-stat-val">{value}</div>
      <div className="adm-stat-hint">
        {delta && (
          <span className={`adm-delta ${delta.up ? "up" : "down"}`}>
            <AdminIcon name={delta.up ? "arrowUp" : "arrowDown"} size={11} />
            {delta.value}
          </span>
        )}{" "}
        {hint}
      </div>
    </div>
  );
}

export function Badge({ tone = "gray", children }: { tone?: "green" | "red" | "amber" | "blue" | "gray"; children: ReactNode }) {
  return <span className={`adm-badge ${tone}`}>{children}</span>;
}

function renderCell(cell: Cell): ReactNode {
  if (typeof cell === "object") return <Badge tone={cell.tone}>{cell.badge}</Badge>;
  return cell === "" ? <span style={{ color: "#a4adc3" }}>—</span> : cell;
}

export function DataTable({
  columns,
  rows,
  footer,
  empty = "Nothing to show yet.",
}: {
  columns: string[];
  rows: ReactNode[][] | Cell[][];
  footer?: ReactNode;
  empty?: string;
}) {
  return (
    <div className="adm-tablewrap">
      <table className="adm-table">
        <thead>
          <tr>
            {columns.map((column, i) => (
              <th key={`${column}-${i}`} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="adm-empty">
                  <strong>{empty}</strong>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className={columns[c] === "Actions" ? "is-actions" : undefined}>
                    {typeof cell === "object" && cell !== null && "badge" in (cell as object)
                      ? renderCell(cell as Cell)
                      : (cell as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {footer && <div className="adm-table-foot">{footer}</div>}
    </div>
  );
}

export function FieldControl({
  field,
  name,
  disabled,
}: {
  field: Field;
  name: string;
  disabled?: boolean;
}) {
  const id = `f-${name}`;
  if (field.type === "checkbox") {
    return (
      <label className={`adm-check${field.wide ? " adm-field is-wide" : ""}`} htmlFor={id}>
        <input id={id} name={name} type="checkbox" defaultChecked={field.value === "on"} disabled={disabled} />
        <span>{field.label}</span>
      </label>
    );
  }
  return (
    <div className={`adm-field${field.wide ? " is-wide" : ""}`}>
      <label htmlFor={id}>{field.label}</label>
      {field.type === "select" ? (
        <select id={id} name={name} className="adm-select" defaultValue={field.value} disabled={disabled}>
          {(field.options ?? []).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea id={id} name={name} className="adm-textarea" defaultValue={field.value} disabled={disabled} />
      ) : (
        <input
          id={id}
          name={name}
          className="adm-input"
          type={field.type === "date" ? "date" : field.type === "file" ? "file" : field.type === "number" ? "number" : "text"}
          step={field.type === "number" ? "any" : undefined}
          defaultValue={field.type === "file" ? undefined : field.value}
          disabled={disabled}
        />
      )}
      {field.hint && <small>{field.hint}</small>}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  primary,
  small,
  icon,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
  small?: boolean;
  icon?: AdminIconName;
}) {
  return (
    <Link className={`adm-btn${primary ? " is-primary" : ""}${small ? " is-small" : ""}`} href={href}>
      {icon && <AdminIcon name={icon} size={small ? 14 : 16} />}
      {children}
    </Link>
  );
}

export function Empty({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="adm-empty">
      <span className="adm-empty-ico">
        <AdminIcon name="box" size={24} />
      </span>
      <strong>{title}</strong>
      <span>{text}</span>
      {children}
    </div>
  );
}
