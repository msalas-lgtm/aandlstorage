// Made-up demo data for admin pages that are layout previews. Nothing here is real tenant data.

export type Tone = "green" | "red" | "amber" | "blue" | "gray";
export type Cell = string | number | { badge: string; tone: Tone };

const FIRST = ["Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Quinn", "Parker", "Hayden", "Rowan", "Jamie", "Cameron", "Dakota", "Sky", "Emerson", "Reese"];
const LAST = ["Reyes", "Nguyen", "Patel", "Brooks", "Kim", "Santos", "Walker", "Ortiz", "Hughes", "Moreno", "Foster", "Bennett", "Cole", "Rivera", "Shah", "Lane"];
const TYPES = ["5 x 5", "5 x 10", "10 x 10", "10 x 15", "10 x 20", "10 x 25"];

export function person(i: number) {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 7 + 3) % LAST.length];
  const digits = String(10 + ((i * 13) % 80)).padStart(2, "0");
  return {
    name: `${first} ${last}`,
    phone: `(845) 555-01${digits}`,
    cell: `(845) 555-02${digits}`,
    email: `${first}.${last}@example.com`.toLowerCase(),
  };
}

export const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function unitStatus(i: number): Cell {
  const mod = i % 7;
  if (mod === 0) return { badge: "Vacant", tone: "gray" };
  if (mod === 3) return { badge: "Past Due", tone: "red" };
  if (mod === 5) return { badge: "Reserved", tone: "amber" };
  return { badge: "Rented", tone: "green" };
}

export function customerRows(count: number): Cell[][] {
  return Array.from({ length: count }, (_, i) => {
    const p = person(i);
    const balance = i % 5 === 3 ? 115 + i * 4 : 0;
    return [p.name, p.phone, p.cell, p.email, balance ? { badge: money(balance), tone: "red" } : money(0), (i % 3) + 1];
  });
}

export function unitRows(count: number): Cell[][] {
  return Array.from({ length: count }, (_, i) => {
    const status = unitStatus(i);
    const vacant = typeof status === "object" && status.badge === "Vacant";
    const p = person(i + 4);
    return [
      String(i + 4 + (i % 3 === 0 ? 40 : 0)),
      status,
      TYPES[i % TYPES.length],
      vacant ? "" : p.name,
      vacant ? "" : p.phone,
      vacant ? "" : p.cell,
      vacant ? "" : p.email,
      vacant ? "" : money(typeof status === "object" && status.badge === "Past Due" ? 150 : 0),
    ];
  });
}

export function waitingRows(count: number): Cell[][] {
  return Array.from({ length: count }, (_, i) => {
    const p = person(i + 9);
    const day = 3 + i * 2;
    return [`12/${day}/2026`, `11/${1 + i}/2026`, p.name, p.email, p.phone, TYPES[i % TYPES.length], i % 4 === 0 ? { badge: "Available", tone: "green" } : { badge: "Waiting", tone: "amber" }, ""];
  });
}

export function messageRows(count: number): Cell[][] {
  const lines = ["Thanks, I'll stop by tomorrow.", "Can I pay my rent online today?", "What are your office hours?", "Gate code isn't working for me."];
  return Array.from({ length: count }, (_, i) => [person(i + 2).name, lines[i % lines.length], `11/${12 - i}/2026 ${9 + (i % 7)}:${i % 2 ? "15" : "40"} AM`, i % 2 ? "Tenant" : "Office"]);
}

export function transactionRows(count: number): Cell[][] {
  const kinds = ["Rent payment", "Autopay", "Late fee", "Deposit", "Admin fee"];
  return Array.from({ length: count }, (_, i) => [`11/${13 - (i % 12)}/2026`, person(i + 1).name, kinds[i % kinds.length], i % 5 === 2 ? money(25) : money(115 + (i % 4) * 35), { badge: i % 9 === 4 ? "Declined" : "Paid", tone: i % 9 === 4 ? "red" : "green" }]);
}
