import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";

// Reads the latest site_notifications row and emails it to all confirmed users.
// Supports separate email content via email_subject / email_html columns.
// Falls back to title / body when email-specific fields are null.
//
// Usage:
//   1. INSERT INTO site_notifications (title, body, email_subject, email_html)
//        VALUES ('...', '...', '...', '...');
//   2. curl -X POST https://your-app/api/admin/blast \
//        -H "Authorization: Bearer $BLAST_SECRET"

export async function POST(req: NextRequest) {
  if (
    req.headers.get("authorization") !== `Bearer ${process.env.BLAST_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Pull latest notification
  const { data: notif, error: notifError } = await supabase
    .from("site_notifications")
    .select("id, title, body, cta_label, cta_url, email_subject, email_html")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (notifError)
    return NextResponse.json({ error: notifError.message }, { status: 500 });
  if (!notif)
    return NextResponse.json(
      { error: "No notifications found" },
      { status: 404 },
    );

  // Fetch all confirmed users
  const body = await req.json().catch(() => ({}));
  const testEmail: string | undefined = body.testEmail;

  let recipients: { email: string; name?: string }[];

  if (testEmail) {
    recipients = [{ email: testEmail }];
  } else {
    const { data: usersPage, error: usersError } =
      await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (usersError)
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    recipients = usersPage.users
      .filter((u) => u.email && u.email_confirmed_at)
      .map((u) => ({
        email: u.email!,
        name: u.user_metadata?.full_name as string | undefined,
      }));
  }

  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, notif: notif.title });
  }

  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY)
    return NextResponse.json(
      { error: "BREVO_API_KEY not set" },
      { status: 500 },
    );

  const FROM_EMAIL = process.env.BLAST_FROM_EMAIL ?? "no-reply@roundpicks.com";

  let sent = 0;
  const errors: string[] = [];

  for (const r of recipients) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: "RoundPicks", email: FROM_EMAIL },
        to: [{ email: r.email, name: r.name }],
        subject: notif.email_subject ?? notif.title,
        htmlContent: notif.email_html
          ? wrapHtml(notif.title, notif.email_html, notif.cta_label ?? null, notif.cta_url ?? null)
          : buildHtml(notif.title, notif.body, notif.cta_label ?? null, notif.cta_url ?? null),
      }),
    });

    if (!res.ok) {
      errors.push(await res.text());
    } else {
      sent++;
    }
  }

  return NextResponse.json({
    sent,
    total: recipients.length,
    notif: notif.title,
    errors,
  });
}

function buildHtml(title: string, body: string, ctaLabel: string | null, ctaUrl: string | null) {
  const bodyHtml = body
    .split("\n")
    .filter(Boolean)
    .map(
      (line) =>
        `<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:rgba(255,255,255,0.75);">${line}</p>`,
    )
    .join("");
  return emailTemplate(title, bodyHtml, ctaLabel, ctaUrl);
}

function wrapHtml(title: string, bodyHtml: string, ctaLabel: string | null, ctaUrl: string | null) {
  return emailTemplate(title, bodyHtml, ctaLabel, ctaUrl);
}

function emailTemplate(title: string, bodyHtml: string, ctaLabel: string | null, ctaUrl: string | null) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2efe7;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efe7;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#06222b;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:40px 40px 32px;color:#fff;">
            <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;line-height:1.15;color:#fff;">${title}</h1>
            ${bodyHtml}
            <a href="${ctaUrl ?? "https://roundpicks.com/dashboard"}"
            style="display:inline-block;margin-top:16px;background:#78ffd6;color:#06222b;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;">
              ${ctaLabel ?? "Go to my groups →"}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 24px;border-top:1px solid rgba(255,255,255,0.08);">
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.3);">
              You're receiving this because you signed up at roundpicks.com.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
