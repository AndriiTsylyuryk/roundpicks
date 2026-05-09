import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { updates } = (await req.json()) as {
    updates: { id: string; group_letter: string }[];
  };

  // Batch by group_letter to minimize queries (≤13 instead of 48)
  const byGroup: Record<string, string[]> = {};
  for (const { id, group_letter } of updates) {
    if (!byGroup[group_letter]) byGroup[group_letter] = [];
    byGroup[group_letter].push(id);
  }

  const results = await Promise.all(
    Object.entries(byGroup).map(([group_letter, ids]) =>
      supabase.from("wc_teams").update({ group_letter }).in("id", ids)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed) {
    return NextResponse.json({ error: failed.error!.message }, { status: 500 });
  }

  return NextResponse.json({ updated: updates.length });
}
