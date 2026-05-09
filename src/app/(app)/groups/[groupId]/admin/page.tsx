import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { syncWC2026All } from "@/lib/matches-api";
import AdminControls from "./AdminControls";
import styles from "./page.module.css";

interface GroupResult {
  wc_group: string;
  rank1_id: string | null;
  rank2_id: string | null;
  rank3_id: string | null;
}

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function AdminPage({ params }: Props) {
  const { groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (!group || group.creator_id !== user.id) notFound();

  const { data: teamsRaw } = await supabase
    .from("wc_teams")
    .select("id, name, group_letter, external_id, is_best_third")
    .order("group_letter")
    .order("name");

  const teams = (teamsRaw ?? []) as {
    id: string;
    name: string;
    group_letter: string;
    external_id: number | null;
    is_best_third: boolean;
  }[];

  // Auto-sync teams from API if table is empty
  if (teams.length === 0) {
    const { teamsData } = await syncWC2026All();
    if (teamsData && teamsData.length > 0) {
      const admin = createAdminClient();
      await admin.from("wc_teams").upsert(teamsData, { onConflict: "name" });
      const { data: fresh } = await supabase
        .from("wc_teams")
        .select("id, name, group_letter, external_id, is_best_third")
        .order("group_letter")
        .order("name");
      teams.push(...((fresh ?? []) as typeof teams));
    }
  }

  // Auto-assign groups if any team still has '?'
  if (teams.length > 0 && teams.some((t) => t.group_letter === "?")) {
    const { teamsData } = await syncWC2026All();
    if (teamsData && teamsData.length > 0) {
      const groupMap: Record<number, string> = {};
      for (const t of teamsData) {
        if (t.external_id && t.group_letter !== "?") groupMap[t.external_id] = t.group_letter;
      }
      if (Object.keys(groupMap).length > 0) {
        const admin = createAdminClient();
        const byLetter: Record<string, string[]> = {};
        for (const t of teams) {
          if (t.group_letter === "?" && t.external_id && groupMap[t.external_id]) {
            const g = groupMap[t.external_id];
            if (!byLetter[g]) byLetter[g] = [];
            byLetter[g].push(t.id);
          }
        }
        await Promise.all(
          Object.entries(byLetter).map(([group_letter, ids]) =>
            admin.from("wc_teams").update({ group_letter }).in("id", ids)
          )
        );
        for (const t of teams) {
          if (t.external_id && groupMap[t.external_id]) {
            t.group_letter = groupMap[t.external_id];
          }
        }
      }
    }
  }

  const assignedCount = teams.filter((t) => t.group_letter !== "?").length;

  const { data: groupResultsRaw } = await supabase
    .from("wc_group_results")
    .select("wc_group, rank1_id, rank2_id, rank3_id");
  const groupResults = (groupResultsRaw ?? []) as GroupResult[];

  return (
    <div className={styles.page}>
      <Link href={`/groups/${groupId}`} className={styles.back}>← Back to group</Link>
      <h1 className={styles.title}>⚙️ Admin: {group.name}</h1>
      <AdminControls
        group={group}
        teamsLoaded={teams.length}
        assignedCount={assignedCount}
        teams={teams}
        groupResults={groupResults}
      />
    </div>
  );
}
