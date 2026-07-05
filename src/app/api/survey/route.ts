import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_ENJOYED = [
  "competing_with_friends",
  "following_tournament",
  "leaderboard_scoring",
  "simplicity",
  "other",
];

const VALID_EVENTS = [
  "champions_league",
  "other_football",
  "other_sports",
  "esports",
  "non_sports",
  "other",
];

export async function POST(req: NextRequest) {
  const { enjoyed_most, enjoyed_most_other, frustrating, want_events, want_events_other, improvement, chat_opt_in } = await req.json();

  if (!Array.isArray(enjoyed_most) || enjoyed_most.length === 0 || enjoyed_most.length > 2) {
    return NextResponse.json({ error: "enjoyed_most must contain 1–2 selections" }, { status: 400 });
  }
  for (const v of enjoyed_most) {
    if (!VALID_ENJOYED.includes(v)) {
      return NextResponse.json({ error: `Invalid enjoyed_most value: ${v}` }, { status: 400 });
    }
  }

  if (want_events !== undefined && want_events !== null) {
    if (!Array.isArray(want_events)) {
      return NextResponse.json({ error: "want_events must be an array" }, { status: 400 });
    }
    for (const v of want_events) {
      if (!VALID_EVENTS.includes(v)) {
        return NextResponse.json({ error: `Invalid want_events value: ${v}` }, { status: 400 });
      }
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: insertError } = await supabase.from("survey_responses").insert({
    user_id: user.id,
    enjoyed_most,
    enjoyed_most_other: typeof enjoyed_most_other === "string" && enjoyed_most_other.trim()
      ? enjoyed_most_other.trim()
      : null,
    frustrating: typeof frustrating === "string" && frustrating.trim()
      ? frustrating.trim()
      : null,
    want_events: Array.isArray(want_events) ? want_events : [],
    want_events_other: typeof want_events_other === "string" && want_events_other.trim()
      ? want_events_other.trim()
      : null,
    improvement: typeof improvement === "string" && improvement.trim()
      ? improvement.trim()
      : null,
    chat_opt_in: !!chat_opt_in,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ has_surveyed: true })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
