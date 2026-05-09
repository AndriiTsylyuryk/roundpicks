import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: { betGroupId: string; teamIds: string[] } = await req.json();
  const { betGroupId, teamIds } = body;

  if (!Array.isArray(teamIds) || teamIds.length !== 8) {
    return NextResponse.json({ error: "Exactly 8 teams required" }, { status: 400 });
  }

  const { data: group } = await supabase
    .from("groups")
    .select("creator_id")
    .eq("id", betGroupId)
    .single();

  if (!group || group.creator_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { error: resetErr } = await admin
    .from("wc_teams")
    .update({ is_best_third: false })
    .not("id", "is", null);
  if (resetErr) return NextResponse.json({ error: resetErr.message }, { status: 500 });

  const { error: setErr } = await admin
    .from("wc_teams")
    .update({ is_best_third: true })
    .in("id", teamIds);
  if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
