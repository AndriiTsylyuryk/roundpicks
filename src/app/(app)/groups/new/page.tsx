"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

interface Event {
  id: string;
  name: string;
  slug: string;
}

function generateInviteCode() {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("50");
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("events")
      .select("id, name, slug")
      .eq("status", "active")
      .order("starts_at")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setEvents(data as Event[]);
          setEventId(data[0].id);
        }
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        max_participants: parseInt(maxParticipants),
        event_id: eventId || null,
      } as never)
      .select("id")
      .single();

    if (groupError || !group) {
      setError(groupError?.message ?? "Failed to create group");
      setLoading(false);
      return;
    }

    const { error: joinError } = await supabase.from("group_members").insert({
      group_id: (group as { id: string }).id,
      user_id: user.id,
    });

    if (joinError) console.error("Auto-join failed:", joinError.message);

    router.push(`/groups/${(group as { id: string }).id}`);
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard" className={styles.back}>← Back to groups</Link>
      <h1 className={styles.title}>Create a group</h1>
      <p className={styles.subtitle}>Set up a prediction group and invite friends or family.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="name">Group name</label>
          <input
            id="name"
            type="text"
            className={styles.input}
            placeholder="e.g. Family WC 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
          />
        </div>

        {events.length > 1 && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="event">Tournament</label>
            <select
              id="event"
              className={styles.select}
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>
        )}

        {events.length === 1 && (
          <div className={styles.field}>
            <label className={styles.label}>Tournament</label>
            <div className={styles.eventBadge}>⚽ {events[0].name}</div>
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="max">Max participants</label>
          <select
            id="max"
            className={styles.select}
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
          >
            <option value="10">Up to 10</option>
            <option value="20">Up to 20</option>
            <option value="50">Up to 50</option>
          </select>
          <span className={styles.hint}>You can always invite more later (up to the limit).</span>
        </div>

        <button type="submit" className={styles.submit} disabled={loading || !name.trim()}>
          {loading ? "Creating…" : "Create group →"}
        </button>
      </form>
    </div>
  );
}
