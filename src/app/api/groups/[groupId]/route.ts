import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json() as { name: string };
  const trimmed = name?.trim();
  if (!trimmed || trimmed.length > 60) {
    return NextResponse.json({ error: "Name must be 1–60 characters" }, { status: 400 });
  }

  const { error } = await supabase
    .from("groups")
    .update({ name: trimmed })
    .eq("id", groupId)
    .eq("creator_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ name: trimmed });
}
