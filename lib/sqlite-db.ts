// SQLite version of the database the site talks to, used when DATABASE_DRIVER=sqlite (see lib/db.ts).
//
// The whole site was written against the Supabase client (db().from("table").select(...).eq(...)). Rather than
// rewrite 40+ files, this file offers the same calls on top of a local SQLite file, so the pages and admin
// actions work the same way on either database. It covers what the site uses: select (with joins such as
// "customers(full_name)"), insert, update, upsert, delete, filters, ordering, counts, single/maybeSingle,
// and file storage for uploaded images (kept in a folder on disk).
//
// It uses Node's built-in SQLite (node:sqlite, Node 22.5 or newer), so there is nothing extra to install.
import fs from "node:fs";
import path from "node:path";

type Row = Record<string, unknown>;
interface Stmt {
  all(...params: unknown[]): Row[];
  get(...params: unknown[]): Row | undefined;
  run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
}
interface Conn {
  exec(sql: string): void;
  prepare(sql: string): Stmt;
}

/* ---------------------------------------------------------------------------------------------------------- */
/* Connection                                                                                                  */
/* ---------------------------------------------------------------------------------------------------------- */

export function sqliteFile() {
  return path.resolve(/* turbopackIgnore: true */ process.env.SQLITE_PATH || "data/aandlstorage.db");
}

export function uploadsRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.env.UPLOADS_DIR || path.join(path.dirname(sqliteFile()), "uploads"));
}

const holder = globalThis as typeof globalThis & { __aandlSqlite?: Conn };

function connection(): Conn {
  if (holder.__aandlSqlite) return holder.__aandlSqlite;
  const builtin = (process as unknown as { getBuiltinModule?: (name: string) => unknown }).getBuiltinModule;
  const sqlite = builtin?.("node:sqlite") as { DatabaseSync: new (file: string) => Conn } | undefined;
  if (!sqlite) throw new Error("SQLite needs Node.js 22.5 or newer (node:sqlite was not found).");
  const file = sqliteFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const conn = new sqlite.DatabaseSync(file);
  conn.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;");
  // Create any missing tables (every statement in the schema is "if not exists", so this is safe each start).
  conn.exec(fs.readFileSync(path.join(/* turbopackIgnore: true */ process.cwd(), "sqlite", "schema.sql"), "utf8"));
  holder.__aandlSqlite = conn;
  return conn;
}

// For proxy.ts: does this blog post exist? (Same job it does against Supabase's REST API.)
export function sqliteBlogSlugExists(slug: string) {
  try {
    return Boolean(connection().prepare("select 1 as ok from blog_posts where slug = ? limit 1").get(slug));
  } catch {
    return true; // if the lookup fails, let the page decide
  }
}

/* ---------------------------------------------------------------------------------------------------------- */
/* Table information                                                                                           */
/* ---------------------------------------------------------------------------------------------------------- */

type Fk = { table: string; from: string; to: string };
type Meta = { cols: Map<string, string>; fks: Fk[]; pk: string[] };
const metas = new Map<string, Meta>();

class DbError extends Error {
  constructor(message: string, public code = "400", public details = "", public hint = "") {
    super(message);
  }
}

function meta(table: string): Meta {
  const cached = metas.get(table);
  if (cached) return cached;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) throw new DbError(`Invalid table name "${table}"`, "42P01");
  const conn = connection();
  const info = conn.prepare(`pragma table_info("${table}")`).all() as { name: string; type: string; pk: number }[];
  if (!info.length) throw new DbError(`relation "${table}" does not exist`, "42P01");
  const fks = (conn.prepare(`pragma foreign_key_list("${table}")`).all() as { table: string; from: string; to: string | null }[]).map((fk) => ({
    table: fk.table,
    from: fk.from,
    to: fk.to ?? "id",
  }));
  const found: Meta = {
    cols: new Map(info.map((column) => [column.name, column.type.toUpperCase()])),
    fks,
    pk: info.filter((column) => column.pk > 0).sort((a, b) => a.pk - b.pk).map((column) => column.name),
  };
  metas.set(table, found);
  return found;
}

function column(table: string, name: string) {
  const type = meta(table).cols.get(name);
  if (type === undefined) throw new DbError(`column ${table}.${name} does not exist`, "42703");
  return `"${name}"`;
}

/* ---------------------------------------------------------------------------------------------------------- */
/* Values in and out                                                                                           */
/* ---------------------------------------------------------------------------------------------------------- */

function toDb(type: string, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  if (type === "JSON_TEXT") return JSON.stringify(value);
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function fromDb(table: string, row: Row): Row {
  const cols = meta(table).cols;
  const out: Row = {};
  for (const [name, value] of Object.entries(row)) {
    const type = cols.get(name) ?? "";
    if (value === null || value === undefined) out[name] = null;
    else if (type === "BOOLEAN") out[name] = Boolean(value);
    else if (type === "JSON_TEXT" && typeof value === "string") {
      try {
        out[name] = JSON.parse(value);
      } catch {
        out[name] = value;
      }
    } else out[name] = typeof value === "bigint" ? Number(value) : value;
  }
  return out;
}

/* ---------------------------------------------------------------------------------------------------------- */
/* Filters                                                                                                     */
/* ---------------------------------------------------------------------------------------------------------- */

type Cond =
  | { k: "cmp"; col: string; op: string; val: unknown }
  | { k: "group"; join: "and" | "or"; items: Cond[] }
  | { k: "not"; item: Cond };

function condSql(table: string, cond: Cond, params: unknown[]): string {
  if (cond.k === "group") {
    if (!cond.items.length) return "1";
    return `(${cond.items.map((item) => condSql(table, item, params)).join(cond.join === "and" ? " and " : " or ")})`;
  }
  if (cond.k === "not") return `(not ${condSql(table, cond.item, params)})`;

  const col = column(table, cond.col);
  const type = meta(table).cols.get(cond.col) ?? "";
  const param = (value: unknown) => {
    params.push(toDb(type, value));
    return "?";
  };
  switch (cond.op) {
    case "eq": return cond.val === null ? `${col} is null` : `${col} = ${param(cond.val)}`;
    case "neq": return `${col} <> ${param(cond.val)}`;
    case "gt": return `${col} > ${param(cond.val)}`;
    case "gte": return `${col} >= ${param(cond.val)}`;
    case "lt": return `${col} < ${param(cond.val)}`;
    case "lte": return `${col} <= ${param(cond.val)}`;
    case "like":
    case "ilike": return `${col} like ${param(cond.val)} escape '\\'`;
    case "is":
      if (cond.val === null) return `${col} is null`;
      return `${col} is ${cond.val ? 1 : 0}`;
    case "in": {
      const list = Array.isArray(cond.val) ? cond.val : [];
      return list.length ? `${col} in (${list.map(param).join(",")})` : "0";
    }
    default:
      throw new DbError(`Unsupported filter operator "${cond.op}"`, "PGRST100");
  }
}

// Splits "a,b(c,d),e" at the commas that are not inside brackets.
function splitTop(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += char;
  }
  if (current.trim()) parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

const unquote = (value: string) => (value.length > 1 && value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value);

function literal(op: string, raw: string): unknown {
  if (op === "is") return raw === "null" ? null : raw === "true";
  if (op === "in") return splitTop(raw.replace(/^\(/, "").replace(/\)$/, "")).map(unquote);
  return unquote(raw);
}

// Reads the string given to .or(), for example "due_on.is.null,due_on.lte.2026-01-01" or "and(a.gte.1,b.lte.2)".
function parseOr(text: string): Cond[] {
  return splitTop(text).map((part): Cond => {
    const group = /^(not\.)?(and|or)\(([\s\S]*)\)$/.exec(part);
    if (group) {
      const inner: Cond = { k: "group", join: group[2] as "and" | "or", items: parseOr(group[3]) };
      return group[1] ? { k: "not", item: inner } : inner;
    }
    const first = part.indexOf(".");
    const second = part.indexOf(".", first + 1);
    const col = part.slice(0, first);
    let op = part.slice(first + 1, second);
    let rest = part.slice(second + 1);
    let negate = false;
    if (op === "not") {
      negate = true;
      const next = rest.indexOf(".");
      op = rest.slice(0, next);
      rest = rest.slice(next + 1);
    }
    const cmp: Cond = { k: "cmp", col, op, val: literal(op, rest) };
    return negate ? { k: "not", item: cmp } : cmp;
  });
}

/* ---------------------------------------------------------------------------------------------------------- */
/* Select lists, including joins                                                                               */
/* ---------------------------------------------------------------------------------------------------------- */

type Embed = { alias: string; table: string; hint?: string; inner: boolean; sel: Sel };
type Sel = { star: boolean; cols: { name: string; alias: string }[]; embeds: Embed[] };

function parseSelect(text: string): Sel {
  const sel: Sel = { star: false, cols: [], embeds: [] };
  for (const item of splitTop(text || "*")) {
    if (item === "*") {
      sel.star = true;
      continue;
    }
    const open = item.indexOf("(");
    if (open > 0 && item.endsWith(")")) {
      const head = item.slice(0, open);
      const [nameWithAlias, ...mods] = head.split("!");
      const [alias, table] = nameWithAlias.includes(":") ? nameWithAlias.split(":") : [nameWithAlias, nameWithAlias];
      sel.embeds.push({
        alias,
        table,
        hint: mods.find((mod) => mod !== "inner"),
        inner: mods.includes("inner"),
        sel: parseSelect(item.slice(open + 1, -1)),
      });
      continue;
    }
    const noCast = item.split("::")[0];
    const [alias, name] = noCast.includes(":") ? noCast.split(":") : [noCast, noCast];
    sel.cols.push({ name, alias });
  }
  return sel;
}

function chunks<T>(list: T[], size = 400): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function fetchIn(table: string, col: string, keys: unknown[]): Row[] {
  const out: Row[] = [];
  for (const group of chunks(keys)) {
    const sql = `select * from "${table}" where ${column(table, col)} in (${group.map(() => "?").join(",")}) order by rowid`;
    out.push(...connection().prepare(sql).all(...group));
  }
  return out;
}

type Hydrated = { raw: Row; out: Row };

// Turns raw database rows into what the site expects: real booleans and objects, only the columns asked for,
// and any joined tables filled in.
function hydrate(table: string, rows: Row[], sel: Sel): Hydrated[] {
  const raws = rows.map((row) => fromDb(table, row));
  const outs = raws.map((raw) => {
    if (sel.star) return { ...raw };
    const out: Row = {};
    for (const { name, alias } of sel.cols) out[alias] = raw[name] ?? null;
    return out;
  });
  if (sel.star) {
    for (let i = 0; i < raws.length; i++) for (const { name, alias } of sel.cols) outs[i][alias] = raws[i][name] ?? null;
  }

  for (const embed of sel.embeds) {
    const parent = meta(table);
    const child = meta(embed.table);
    const toOne = parent.fks.find((fk) => fk.table === embed.table && (!embed.hint || fk.from === embed.hint));
    if (toOne) {
      // Many-to-one, for example a rental's customer: one object (or null).
      const keys = [...new Set(raws.map((raw) => raw[toOne.from]).filter((key) => key !== null && key !== undefined))];
      const found = hydrate(embed.table, keys.length ? fetchIn(embed.table, toOne.to, keys) : [], embed.sel);
      const byKey = new Map(found.map((entry) => [entry.raw[toOne.to], entry.out]));
      raws.forEach((raw, i) => {
        outs[i][embed.alias] = byKey.get(raw[toOne.from]) ?? null;
      });
      continue;
    }
    const toMany = child.fks.find((fk) => fk.table === table && (!embed.hint || fk.from === embed.hint));
    if (!toMany) throw new DbError(`Could not find a relationship between '${table}' and '${embed.table}'`, "PGRST200");
    // One-to-many, for example a customer's rentals: a list (or [{ count }] for "rentals(count)").
    const keys = [...new Set(raws.map((raw) => raw[toMany.to]).filter((key) => key !== null && key !== undefined))];
    const countOnly = !embed.sel.star && embed.sel.cols.length === 1 && embed.sel.cols[0].name === "count" && !embed.sel.embeds.length;
    const rowsFound = keys.length ? fetchIn(embed.table, toMany.from, keys) : [];
    if (countOnly) {
      const counts = new Map<unknown, number>();
      for (const row of rowsFound) counts.set(row[toMany.from], (counts.get(row[toMany.from]) ?? 0) + 1);
      raws.forEach((raw, i) => {
        outs[i][embed.alias] = [{ count: counts.get(raw[toMany.to]) ?? 0 }];
      });
      continue;
    }
    const found = hydrate(embed.table, rowsFound, embed.sel);
    const groups = new Map<unknown, Row[]>();
    for (const entry of found) {
      const list = groups.get(entry.raw[toMany.from]) ?? [];
      list.push(entry.out);
      groups.set(entry.raw[toMany.from], list);
    }
    raws.forEach((raw, i) => {
      outs[i][embed.alias] = groups.get(raw[toMany.to]) ?? [];
    });
  }

  const keep = raws.map((raw, i) => ({ raw, out: outs[i] }));
  const inner = sel.embeds.filter((embed) => embed.inner);
  return inner.length
    ? keep.filter((entry) => inner.every((embed) => (Array.isArray(entry.out[embed.alias]) ? (entry.out[embed.alias] as unknown[]).length > 0 : entry.out[embed.alias] !== null)))
    : keep;
}

/* ---------------------------------------------------------------------------------------------------------- */
/* The query builder                                                                                           */
/* ---------------------------------------------------------------------------------------------------------- */

type Failure = { message: string; details: string; hint: string; code: string };
type Result = { data: unknown; error: Failure | null; count: number | null; status: number; statusText: string };

function failure(error: unknown): Failure {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof DbError) return { message, details: error.details, hint: error.hint, code: error.code };
  if (/UNIQUE constraint failed/i.test(message)) {
    return { message: `duplicate key value violates unique constraint (${message.replace(/^.*failed:\s*/i, "")})`, details: message, hint: "", code: "23505" };
  }
  if (/FOREIGN KEY constraint failed/i.test(message)) return { message: "violates foreign key constraint", details: message, hint: "", code: "23503" };
  if (/CHECK constraint failed/i.test(message)) return { message: `violates check constraint (${message.replace(/^.*failed:\s*/i, "")})`, details: message, hint: "", code: "23514" };
  if (/NOT NULL constraint failed/i.test(message)) return { message: `null value violates not-null constraint (${message.replace(/^.*failed:\s*/i, "")})`, details: message, hint: "", code: "23502" };
  return { message, details: "", hint: "", code: "SQLITE" };
}

function savepoint<T>(work: () => T): T {
  const conn = connection();
  conn.exec("SAVEPOINT api");
  try {
    const result = work();
    conn.exec("RELEASE api");
    return result;
  } catch (error) {
    conn.exec("ROLLBACK TO api");
    conn.exec("RELEASE api");
    throw error;
  }
}

class Builder implements PromiseLike<Result> {
  private action: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private selectText: string | null = null;
  private payload: Row[] = [];
  private conds: Cond[] = [];
  private orders: { col: string; asc: boolean; nullsFirst?: boolean }[] = [];
  private max: number | null = null;
  private skip = 0;
  private wantCount = false;
  private headOnly = false;
  private mode: "many" | "single" | "maybe" = "many";
  private conflict: string[] | null = null;
  private ignoreDuplicates = false;
  private shouldThrow = false;
  private promise?: Promise<Result>;

  constructor(private table: string) {}

  /* what to do */
  select(columns = "*", options?: { count?: string; head?: boolean }) {
    this.selectText = columns;
    if (options?.count) this.wantCount = true;
    if (options?.head) this.headOnly = true;
    return this;
  }
  insert(values: Row | Row[]) {
    this.action = "insert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }
  update(values: Row) {
    this.action = "update";
    this.payload = [values];
    return this;
  }
  upsert(values: Row | Row[], options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.action = "upsert";
    this.payload = Array.isArray(values) ? values : [values];
    this.conflict = options?.onConflict ? options.onConflict.split(",").map((name) => name.trim()) : null;
    this.ignoreDuplicates = Boolean(options?.ignoreDuplicates);
    return this;
  }
  delete() {
    this.action = "delete";
    return this;
  }

  /* filters */
  private add(col: string, op: string, val: unknown) {
    this.conds.push({ k: "cmp", col, op, val });
    return this;
  }
  eq(col: string, val: unknown) { return this.add(col, "eq", val); }
  neq(col: string, val: unknown) { return this.add(col, "neq", val); }
  gt(col: string, val: unknown) { return this.add(col, "gt", val); }
  gte(col: string, val: unknown) { return this.add(col, "gte", val); }
  lt(col: string, val: unknown) { return this.add(col, "lt", val); }
  lte(col: string, val: unknown) { return this.add(col, "lte", val); }
  like(col: string, val: unknown) { return this.add(col, "like", val); }
  ilike(col: string, val: unknown) { return this.add(col, "ilike", val); }
  is(col: string, val: unknown) { return this.add(col, "is", val); }
  in(col: string, val: unknown[]) { return this.add(col, "in", val); }
  filter(col: string, op: string, val: unknown) { return this.add(col, op, op === "in" || op === "is" ? literal(op, String(val)) : val); }
  match(values: Row) {
    for (const [col, val] of Object.entries(values)) this.add(col, "eq", val);
    return this;
  }
  not(col: string, op: string, val: unknown) {
    this.conds.push({ k: "not", item: { k: "cmp", col, op, val: typeof val === "string" && (op === "is" || op === "in") ? literal(op, val) : val } });
    return this;
  }
  or(text: string) {
    this.conds.push({ k: "group", join: "or", items: parseOr(text) });
    return this;
  }

  /* shaping */
  order(col: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orders.push({ col, asc: options?.ascending !== false, nullsFirst: options?.nullsFirst });
    return this;
  }
  limit(count: number) {
    this.max = count;
    return this;
  }
  range(from: number, to: number) {
    this.skip = from;
    this.max = to - from + 1;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }
  returns() { return this; }
  throwOnError() {
    this.shouldThrow = true;
    return this;
  }

  /* running it */
  then<A = Result, B = never>(onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null, onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null): Promise<A | B> {
    this.promise ??= Promise.resolve().then(() => this.execute());
    return this.promise.then(onfulfilled, onrejected);
  }

  private execute(): Result {
    let result: Result;
    try {
      result = this.run();
    } catch (error) {
      result = { data: null, error: failure(error), count: null, status: 400, statusText: "Bad Request" };
    }
    if (result.error && this.shouldThrow) throw Object.assign(new Error(result.error.message), result.error);
    return result;
  }

  private where(params: unknown[]) {
    const sql = this.conds.map((cond) => condSql(this.table, cond, params)).join(" and ");
    return sql ? ` where ${sql}` : "";
  }

  private finish(rows: Row[], count: number | null): Result {
    const wants = this.selectText !== null;
    const hydrated = wants ? hydrate(this.table, rows, parseSelect(this.selectText!)).map((entry) => entry.out) : [];
    if (!wants) return { data: null, error: null, count, status: this.action === "insert" ? 201 : 200, statusText: "OK" };
    if (this.mode === "many") return { data: hydrated, error: null, count, status: 200, statusText: "OK" };
    if (hydrated.length === 1) return { data: hydrated[0], error: null, count, status: 200, statusText: "OK" };
    if (hydrated.length === 0 && this.mode === "maybe") return { data: null, error: null, count, status: 200, statusText: "OK" };
    return {
      data: null,
      error: { message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${hydrated.length} rows`, hint: "", code: "PGRST116" },
      count,
      status: 406,
      statusText: "Not Acceptable",
    };
  }

  private run(): Result {
    const table = this.table;
    const info = meta(table);
    const conn = connection();

    if (this.action === "select") {
      const params: unknown[] = [];
      const where = this.where(params);
      const count = this.wantCount ? Number((conn.prepare(`select count(*) as n from "${table}"${where}`).get(...params) as Row).n) : null;
      if (this.headOnly) return { data: null, error: null, count, status: 200, statusText: "OK" };

      const orderParts = this.orders.map((order) => {
        const name = column(table, order.col);
        const text = info.cols.get(order.col) === "TEXT" ? " collate nocase" : "";
        const nulls = order.nullsFirst ?? !order.asc; // like Postgres: nulls last when ascending, first when descending
        return `${name}${text} ${order.asc ? "asc" : "desc"} nulls ${nulls ? "first" : "last"}`;
      });
      orderParts.push("rowid");
      let sql = `select * from "${table}"${where} order by ${orderParts.join(", ")}`;
      if (this.max !== null || this.skip) sql += ` limit ${this.max ?? -1} offset ${this.skip}`;
      return this.finish(conn.prepare(sql).all(...params), count);
    }

    if (this.action === "delete") {
      const params: unknown[] = [];
      const rows = conn.prepare(`delete from "${table}"${this.where(params)} returning *`).all(...params);
      return this.finish(rows, null);
    }

    // insert / update / upsert
    const encode = (values: Row) => {
      const names: string[] = [];
      const params: unknown[] = [];
      for (const [name, value] of Object.entries(values)) {
        if (value === undefined) continue;
        const type = info.cols.get(name);
        if (type === undefined) throw new DbError(`Could not find the '${name}' column of '${table}' in the schema cache`, "PGRST204");
        names.push(name);
        params.push(toDb(type, value));
      }
      return { names, params };
    };

    if (this.action === "update") {
      const { names, params } = encode(this.payload[0] ?? {});
      if (!names.length) return this.finish([], null);
      const where: unknown[] = [];
      const whereSql = this.where(where);
      const rows = conn
        .prepare(`update "${table}" set ${names.map((name) => `"${name}" = ?`).join(", ")}${whereSql} returning *`)
        .all(...params, ...where);
      return this.finish(rows, null);
    }

    const rows = savepoint(() => {
      const out: Row[] = [];
      for (const values of this.payload) {
        const { names, params } = encode(values);
        let sql = names.length
          ? `insert into "${table}" (${names.map((name) => `"${name}"`).join(", ")}) values (${names.map(() => "?").join(", ")})`
          : `insert into "${table}" default values`;
        if (this.action === "upsert") {
          const target = (this.conflict ?? info.pk).map((name) => column(table, name));
          const update = names.filter((name) => !(this.conflict ?? info.pk).includes(name));
          sql +=
            this.ignoreDuplicates || !update.length
              ? ` on conflict (${target.join(", ")}) do nothing`
              : ` on conflict (${target.join(", ")}) do update set ${update.map((name) => `"${name}" = excluded."${name}"`).join(", ")}`;
        }
        out.push(...conn.prepare(`${sql} returning *`).all(...params));
      }
      return out;
    });
    return this.finish(rows, null);
  }
}

/* ---------------------------------------------------------------------------------------------------------- */
/* File storage (uploaded images live in a folder on disk)                                                     */
/* ---------------------------------------------------------------------------------------------------------- */

const safeName = (name: string) => path.basename(name);

export function uploadPath(bucket: string, name: string) {
  return path.join(uploadsRoot(), safeName(bucket), safeName(name));
}

const bucketApi = (bucket: string) => ({
  async upload(name: string, body: Buffer | ArrayBuffer | Uint8Array | Blob, options?: { upsert?: boolean }) {
    try {
      const file = uploadPath(bucket, name);
      if (fs.existsSync(file) && !options?.upsert) return { data: null, error: { message: "The resource already exists", statusCode: "409" } };
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const bytes = body instanceof Blob ? Buffer.from(await body.arrayBuffer()) : Buffer.from(body as ArrayBuffer);
      fs.writeFileSync(file, bytes);
      return { data: { path: safeName(name), id: safeName(name), fullPath: `${bucket}/${safeName(name)}` }, error: null };
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : String(error), statusCode: "500" } };
    }
  },
  async remove(names: string[]) {
    try {
      for (const name of names) fs.rmSync(uploadPath(bucket, name), { force: true });
      return { data: names.map((name) => ({ name })), error: null };
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : String(error) } };
    }
  },
  async list(_prefix?: string, options?: { limit?: number; sortBy?: { column: string; order: string } }) {
    try {
      void _prefix; // the uploads folder is flat, so there are no sub-folders to list
      const dir = path.join(uploadsRoot(), safeName(bucket));
      if (!fs.existsSync(dir)) return { data: [], error: null };
      const files = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => {
          const stat = fs.statSync(path.join(dir, entry.name));
          return {
            name: entry.name,
            id: entry.name,
            created_at: (stat.birthtime.getTime() ? stat.birthtime : stat.mtime).toISOString(),
            updated_at: stat.mtime.toISOString(),
            metadata: { size: stat.size },
          };
        });
      const key = (options?.sortBy?.column ?? "name") as "name" | "created_at" | "updated_at";
      const direction = options?.sortBy?.order === "desc" ? -1 : 1;
      files.sort((a, b) => (a[key] < b[key] ? -direction : a[key] > b[key] ? direction : 0));
      return { data: files.slice(0, options?.limit ?? 100), error: null };
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : String(error) } };
    }
  },
});

/* ---------------------------------------------------------------------------------------------------------- */

export function sqliteClient() {
  connection(); // opens the file (and creates the tables) right away so a bad path fails loudly
  return {
    from: (table: string) => new Builder(table),
    storage: { from: bucketApi },
    rpc: async () => ({ data: null, error: { message: "rpc is not available with SQLite", code: "PGRST202", details: "", hint: "" } }),
  };
}
