"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

type Mode = "simple" | "advanced";
type MaxParticipants = 10 | 25 | 50 | 100;

function generateInviteCode() {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/* ── Section ── */
function Section({ step, label, sub, children }: { step: number; label: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.stepPill}>{step}</span>
        <h2 className={styles.sectionLabel}>{label}</h2>
      </div>
      {sub && <p className={styles.sectionSub}>{sub}</p>}
      <div className={styles.sectionCard}>{children}</div>
    </section>
  );
}

/* ── Field ── */
function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <div className={styles.fieldHint}>{hint}</div>}
    </div>
  );
}

/* ── TournamentRow ── */
function TournamentRow({ name, meta }: { name: string; meta: string }) {
  return (
    <div className={styles.tournamentRow}>
      <span className={styles.tournamentOrb} aria-hidden />
      <div className={styles.tournamentInfo}>
        <div className={styles.tournamentName}>{name}</div>
        <div className={styles.tournamentMeta}>{meta}</div>
      </div>
      <span className={styles.tournamentDefault}>Default</span>
    </div>
  );
}

/* ── ModeCard ── */
function ModeCard({ id, selected, onSelect, title, tagline, description, bullets, effort, badge }: {
  id: string; selected: boolean; onSelect: () => void;
  title: string; tagline: string; description: string;
  bullets: string[]; effort: string; badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      aria-labelledby={`${id}-title`}
      className={`${styles.modeCard} ${selected ? styles.modeCardSelected : ""}`}
    >
      <span className={`${styles.modeRadio} ${selected ? styles.modeRadioSelected : ""}`} aria-hidden>
        {selected ? "✓" : ""}
      </span>

      {badge && <span className={styles.modeBadge}>{badge}</span>}

      <div id={`${id}-title`} className={styles.modeTitle}>{title}</div>
      <div className={styles.modeTagline}>{tagline}</div>
      <p className={styles.modeDesc}>{description}</p>

      <ul className={styles.modeBullets}>
        {bullets.map((b, i) => (
          <li key={i} className={styles.modeBullet}>
            <span className={styles.modeBulletDot} aria-hidden>·</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className={styles.modeEffort}>{effort}</div>
    </button>
  );
}

/* ── ParticipantsPicker ── */
function ParticipantsPicker({ value, onChange }: { value: MaxParticipants; onChange: (n: MaxParticipants) => void }) {
  const options: MaxParticipants[] = [10, 25, 50, 100];
  return (
    <div className={styles.pills}>
      {options.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-pressed={n === value}
          className={`${styles.pill} ${n === value ? styles.pillActive : ""}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/* ── Page ── */
export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("simple");
  const [maxParticipants, setMaxParticipants] = useState<MaxParticipants>(25);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return;
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const invite_code = generateInviteCode();

    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: name.trim(),
        creator_id: user.id,
        invite_code,
        max_participants: maxParticipants,
        mode,
      } as never)
      .select("id")
      .single();

    if (groupError || !group) {
      setError(groupError?.message ?? "Failed to create group");
      setLoading(false);
      return;
    }

    await supabase.from("group_members").insert({
      group_id: (group as { id: string }).id,
      user_id: user.id,
    });

    router.push(`/groups/${(group as { id: string }).id}`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        <Link href="/dashboard" className={styles.back}>← Dashboard</Link>

        <header className={styles.header}>
          <div className="eyebrow" style={{ color: "var(--color-text-light)" }}>Create a group</div>
          <h1 className={styles.title}>Set up your group</h1>
        </header>

        {error && <p className={styles.error}>{error}</p>}

        <Section step={1} label="Basics">
          <Field label="Group name" hint="Visible to anyone you invite." htmlFor="group-name">
            <input
              id="group-name"
              type="text"
              className={styles.input}
              placeholder="e.g. Family WC 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </Field>
          <Field label="Tournament" hint="More tournaments coming after the World Cup.">
            <TournamentRow
              name="FIFA World Cup 2026"
              meta="Jun 11 — Jul 19 · 48 teams · 104 matches"
            />
          </Field>
        </Section>

        <Section
          step={2}
          label="Prediction mode"
          sub="Pick how deep the group goes. You can't change this once predictions open."
        >
          <div className={styles.modeGrid}>
            <ModeCard
              id="simple"
              selected={mode === "simple"}
              onSelect={() => setMode("simple")}
              title="Simple"
              tagline="Just the big picture."
              description="Predict which teams will advance from each group, plus the knockout winners."
              bullets={[
                "Rank 1st / 2nd in each group",
                "Pick best third-placed teams",
                "Predict every knockout winner",
              ]}
              effort="≈ 5 minutes to fill in"
            />
            <ModeCard
              id="advanced"
              selected={mode === "advanced"}
              onSelect={() => setMode("advanced")}
              title="Advanced"
              tagline="Call every match."
              description="Predict the result of every group-stage match — win, draw, or lose. Then knockouts as usual."
              bullets={[
                "Pick W / D / L for each of the 72 group matches",
                "Plus rankings and best third-placed teams",
                "Predict every knockout winner",
              ]}
              effort="≈ 20 minutes to fill in"
              badge="More points up for grabs"
            />
          </div>
        </Section>

        <Section step={3} label="Invites">
          <Field label="Max participants" hint="You can change this later.">
            <ParticipantsPicker value={maxParticipants} onChange={setMaxParticipants} />
          </Field>
        </Section>

        <footer className={styles.footerBar}>
          <span className={styles.footerHint}>You can invite people right after creating the group.</span>
          <div className={styles.footerBtns}>
            <Link href="/dashboard" className={styles.cancelBtn}>Cancel</Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !name.trim()}
              className={styles.submitBtn}
            >
              {loading ? "Creating…" : "Create group →"}
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
