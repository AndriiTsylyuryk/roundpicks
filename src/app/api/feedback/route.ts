import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { message, page, rating } = await req.json();

  const hasRating = typeof rating === "number" && rating >= 1 && rating <= 5;
  const hasMessage = typeof message === "string" && message.trim().length > 0;

  if (!hasRating && !hasMessage) {
    return NextResponse.json({ error: "Rating or message required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("feedback").insert({
    user_id: user?.id ?? null,
    message: hasMessage ? message.trim() : null,
    page: page ?? null,
    rating: hasRating ? rating : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (user && hasRating) {
    await supabase.from("profiles").update({ has_rated: true }).eq("id", user.id);
  }

  return NextResponse.json({ ok: true });
}
