import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";

interface ResultRow {
  wc_group: string;
  rank1_id: string | null;
  rank2_id: string | null;
  rank3_id: string | null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: { betGroupId: string; results: ResultRow[] } = await req.json();
  const { betGroupId, results } = body;

  const { data: group } = await supabase
    .from("groups")
    .select("creator_id")
    .eq("id", betGroupId)
    .single();

  if (!group || group.creator_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const rows = results.map((r) => ({
    wc_group: r.wc_group,
    rank1_id: r.rank1_id || null,
    rank2_id: r.rank2_id || null,
    rank3_id: r.rank3_id || null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await admin.from("wc_group_results").upsert(rows, { onConflict: "wc_group" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
