import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: group } = await supabase
    .from("groups")
    .select("creator_id")
    .eq("id", groupId)
    .single();

  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (group.creator_id === user.id)
    return NextResponse.json({ error: "Creator cannot leave — delete the group instead" }, { status: 403 });

  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const admin = createAdminClient();

  await Promise.all([
    admin.from("group_picks").delete().eq("group_id", groupId).eq("user_id", user.id),
    admin.from("best_third_picks").delete().eq("group_id", groupId).eq("user_id", user.id),
    admin.from("knockout_picks").delete().eq("group_id", groupId).eq("user_id", user.id),
    admin.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id),
  ]);

  return NextResponse.json({ ok: true });
}
