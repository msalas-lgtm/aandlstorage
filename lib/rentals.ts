import "server-only";
import { db } from "@/lib/db";

// Claims one vacant unit of a size. The update only succeeds while the unit is still vacant, so two people
// renting at the same moment can never get the same unit. Returns null when the size is full.
export async function claimVacantUnit(unitTypeId: number): Promise<{ id: number; name: string } | null> {
  const client = db();
  const { data: candidates } = await client
    .from("units")
    .select("id,name")
    .eq("unit_type_id", unitTypeId)
    .eq("status", "vacant")
    .order("name")
    .limit(10);
  for (const candidate of candidates ?? []) {
    const { data: claimed } = await client
      .from("units")
      .update({ status: "reserved", updated_at: new Date().toISOString() })
      .eq("id", candidate.id)
      .eq("status", "vacant")
      .select("id,name");
    if (claimed?.length) return claimed[0];
  }
  return null;
}

export async function releaseUnit(unitId: number) {
  await db().from("units").update({ status: "vacant", updated_at: new Date().toISOString() }).eq("id", unitId);
}
