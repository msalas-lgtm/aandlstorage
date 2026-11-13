import type { ReactNode } from "react";

// Simple admin lists (fees, taxes, promotions, products, letter templates, late-fee rules) share one
// manager. Each entity says which table it uses, which fields it has and how a row is shown.

export type FieldKind = "text" | "textarea" | "money" | "number" | "percent" | "select" | "date" | "check";

export type EntityField = {
  name: string; // database column
  label: string;
  kind: FieldKind;
  options?: [string, string][]; // [value, label] for selects
  required?: boolean;
  hint?: string;
  placeholder?: string;
  wide?: boolean;
  transform?: "upper" | "lower";
};

export type Row = Record<string, unknown>;

export type EntityConfig = {
  key: string;
  table: string;
  path: string; // admin page that lists it
  title: string;
  singular: string;
  description: string;
  emptyText: string;
  orderBy: string;
  fields: EntityField[];
  columns: string[];
  display: (row: Row) => ReactNode[];
};

const cents = (value: unknown) =>
  `$${(Number(value ?? 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ENTITIES: Record<string, EntityConfig> = {
  fees: {
    key: "fees",
    table: "fees",
    path: "/admin/manual_fees",
    title: "Fees",
    singular: "fee",
    description: "Standard fees you charge customers, such as late or lock fees. Pick one when you add a charge to a customer.",
    emptyText: "No fees yet. Add your first fee.",
    orderBy: "name",
    columns: ["Name", "Amount", "Description"],
    fields: [
      { name: "name", label: "Name", kind: "text", required: true },
      { name: "amount_cents", label: "Amount ($)", kind: "money", required: true },
      { name: "description", label: "Description", kind: "text", wide: true },
    ],
    display: (row) => [<strong key="n">{String(row.name)}</strong>, cents(row.amount_cents), String(row.description ?? "")],
  },
  tax_rates: {
    key: "tax_rates",
    table: "tax_rates",
    path: "/admin/tax_rates",
    title: "Tax Rates",
    singular: "tax rate",
    description: "Sales tax rates. Pick one when you add a charge or sell a retail product, and the tax is worked out for you.",
    emptyText: "No tax rates yet. Add one if you charge sales tax.",
    orderBy: "name",
    columns: ["Name", "Tax Rate"],
    fields: [
      { name: "name", label: "Name", kind: "text", required: true },
      { name: "rate_percent", label: "Tax rate (%)", kind: "percent", required: true, hint: "For example 8.375" },
    ],
    display: (row) => [<strong key="n">{String(row.name)}</strong>, `${Number(row.rate_percent)}%`],
  },
  promotions: {
    key: "promotions",
    table: "promotions",
    path: "/admin/available_promotions",
    title: "Promotions",
    singular: "promotion",
    description: "Discount codes. A customer can enter the code when renting online and the discount comes off their first month.",
    emptyText: "There are no promotions. Add one, for example 10% off the first month.",
    orderBy: "created_at",
    columns: ["Name", "Code", "Discount", "Status"],
    fields: [
      { name: "name", label: "Name", kind: "text", required: true },
      { name: "code", label: "Code", kind: "text", required: true, transform: "upper", hint: "What the customer types, for example FIRST10" },
      {
        name: "discount_type",
        label: "Discount type",
        kind: "select",
        required: true,
        options: [["percent", "Percent off"], ["amount", "Dollars off"]],
      },
      { name: "discount_value", label: "Discount", kind: "percent", required: true, hint: "A percentage, or a dollar amount for Dollars off" },
      { name: "description", label: "Description", kind: "text", wide: true },
      { name: "active", label: "Active", kind: "check" },
    ],
    display: (row) => [
      <strong key="n">{String(row.name)}</strong>,
      <code key="c">{String(row.code)}</code>,
      row.discount_type === "percent" ? `${Number(row.discount_value)}% off` : `$${Number(row.discount_value).toFixed(2)} off`,
      row.active ? "Active" : "Off",
    ],
  },
  products: {
    key: "products",
    table: "products",
    path: "/admin/products",
    title: "Products",
    singular: "product",
    description: "Retail items you sell, such as locks and boxes.",
    emptyText: "There are currently no products to display. Add one.",
    orderBy: "name",
    columns: ["Name", "SKU", "Price", "In stock", "Status"],
    fields: [
      { name: "name", label: "Name", kind: "text", required: true },
      { name: "sku", label: "SKU", kind: "text" },
      { name: "price_cents", label: "Price ($)", kind: "money", required: true },
      { name: "stock", label: "In stock", kind: "number", required: true },
      { name: "active", label: "Available for sale", kind: "check" },
    ],
    display: (row) => [
      <strong key="n">{String(row.name)}</strong>,
      String(row.sku ?? ""),
      cents(row.price_cents),
      String(row.stock),
      row.active ? "For sale" : "Hidden",
    ],
  },
  letter_templates: {
    key: "letter_templates",
    table: "letter_templates",
    path: "/admin/notification_templates",
    title: "Templates",
    singular: "template",
    description:
      "Letter templates you can print for customers. Merge fields: {{name}}, {{address}}, {{unit}}, {{outstanding}}, {{credit}}, {{balance}}, {{phone}}, {{facility}}, {{date}}. Letters are printed, never emailed.",
    emptyText: "No templates yet. Add a letter, such as a past due notice.",
    orderBy: "name",
    columns: ["Name", "Subject"],
    fields: [
      { name: "name", label: "Name", kind: "text", required: true },
      { name: "subject", label: "Subject line", kind: "text" },
      { name: "body", label: "Letter text", kind: "textarea", required: true, wide: true },
    ],
    display: (row) => [<strong key="n">{String(row.name)}</strong>, String(row.subject ?? "")],
  },
  late_rules: {
    key: "late_rules",
    table: "late_rules",
    path: "/admin/past_due_rule_batches",
    title: "Late/Lien Rules",
    singular: "rule",
    description:
      "When a charge is this many days overdue, Monthly Billing adds the late fee once. You can have several rules, such as a fee at 5 days and another at 30.",
    emptyText: "No rules yet. Add a late fee rule.",
    orderBy: "days_past_due",
    columns: ["Name", "Days past due", "Late fee", "Status"],
    fields: [
      { name: "name", label: "Name", kind: "text", required: true },
      { name: "days_past_due", label: "Days past due", kind: "number", required: true },
      { name: "fee_cents", label: "Late fee ($)", kind: "money", required: true },
      { name: "active", label: "Active", kind: "check" },
    ],
    display: (row) => [
      <strong key="n">{String(row.name)}</strong>,
      `${row.days_past_due} days`,
      cents(row.fee_cents),
      row.active ? "Active" : "Off",
    ],
  },
};

export function entityFor(key: string) {
  return ENTITIES[key];
}

// Turns a submitted form into a database row, or an error message.
export function parseEntity(config: EntityConfig, data: FormData): { row: Row } | { error: string } {
  const row: Row = {};
  for (const field of config.fields) {
    const raw = data.get(field.name);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (field.kind === "check") {
      row[field.name] = raw === "on";
      continue;
    }
    if (field.required && !value) return { error: `Please include ${field.label.replace(/\s*\(.*\)$/, "").toLowerCase()}.` };
    switch (field.kind) {
      case "money": {
        const n = Number(value.replace(/[^0-9.]/g, ""));
        if (value && !Number.isFinite(n)) return { error: `${field.label} must be a number.` };
        row[field.name] = Math.round((n || 0) * 100);
        break;
      }
      case "number": {
        const n = Number(value || 0);
        if (!Number.isInteger(n)) return { error: `${field.label} must be a whole number.` };
        row[field.name] = n;
        break;
      }
      case "percent": {
        const n = Number(value.replace(/[^0-9.]/g, ""));
        if (value && !Number.isFinite(n)) return { error: `${field.label} must be a number.` };
        row[field.name] = n || 0;
        break;
      }
      case "select":
        if (!field.options?.some(([option]) => option === value)) return { error: `Please choose ${field.label.toLowerCase()}.` };
        row[field.name] = value;
        break;
      case "date":
        row[field.name] = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
        break;
      default: {
        const text = field.kind === "textarea" ? String(raw ?? "").trim() : value;
        row[field.name] = field.transform === "upper" ? text.toUpperCase() : field.transform === "lower" ? text.toLowerCase() : text;
      }
    }
  }
  return { row };
}
