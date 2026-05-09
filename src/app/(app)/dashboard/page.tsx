import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

interface GroupRow {
  id: string;
  name: string;
  creator_id: string;
  phase1_locked: boolean;
  phase1_deadline: string | null;
  group_members: { count: number }[];
  events: { name: string } | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("group_members")
    .select(`
      group_id,
      joined_at,
      groups (
        id, name, creator_id, phase1_locked, phase1_deadline,
        group_members (count),
        events (name)
      )
    `)
    .eq("user_id", user!.id)
    .order("joined_at", { ascending: false }) as unknown as { data: { groups: GroupRow | null }[] | null };

  const groups = (memberships?.map((m) => m.groups).filter(Boolean) ?? []) as GroupRow[];

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>My Groups</h1>
        <Link href="/groups/new" className={styles.createBtn}>
          + Create group
        </Link>
      </div>

      <div className={styles.grid}>
        {groups.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⚽</div>
            <h2>No groups yet</h2>
            <p>Create a group and invite your friends to start predicting!</p>
            <Link href="/groups/new" className={styles.emptyBtn}>
              + Create your first group
            </Link>
          </div>
        )}

        {groups.map((group) => {
          const memberCount = group.group_members?.[0]?.count ?? 0;
          const isCreator = group.creator_id === user!.id;

          return (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className={styles.card}
            >
              <div className={styles.cardTop}>
                <span className={styles.cardName}>{group.name}</span>
                {isCreator && <span className={styles.creatorBadge}>Admin</span>}
              </div>
              {group.events && (
                <span className={styles.eventTag}>⚽ {group.events.name}</span>
              )}
              <div className={styles.cardMeta}>
                <span>👥 {memberCount} participant{memberCount !== 1 ? "s" : ""}</span>
                {group.phase1_deadline && (
                  <span>⏰ Deadline {new Date(group.phase1_deadline).toLocaleDateString()}</span>
                )}
              </div>
              <span className={`${styles.phaseBadge} ${group.phase1_locked ? styles.locked : styles.open}`}>
                {group.phase1_locked ? "🔒 Predictions closed" : "✅ Predictions open"}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
