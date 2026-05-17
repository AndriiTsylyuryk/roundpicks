import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminControls from "./AdminControls";
import styles from "./page.module.css";

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

  const { data: firstGroupMatch } = await supabase
    .from("wc_matches")
    .select("kickoff_at")
    .eq("round", "GROUP")
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <div className={styles.page}>
      <Link href={`/groups/${groupId}`} className={styles.back}>← Back to group</Link>
      <h1 className={styles.title}>⚙️ Admin: {group.name}</h1>
      <AdminControls
        group={group}
        firstGroupKickoff={firstGroupMatch?.kickoff_at ?? null}
      />
    </div>
  );
}
