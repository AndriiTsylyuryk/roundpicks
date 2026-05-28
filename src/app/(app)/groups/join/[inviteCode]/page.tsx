import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import JoinGroupButton from "./JoinGroupButton";
import styles from "./page.module.css";

interface Props {
  params: Promise<{ inviteCode: string }>;
}

export default async function JoinGroupPage({ params }: Props) {
  const { inviteCode } = await params;

  // User auth via regular client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/signup?redirectTo=/groups/join/${inviteCode}`);

  // Group lookup via admin client — bypasses RLS so any logged-in user can find a group by invite code
  const admin = createAdminClient();
  const { data: group } = await admin
    .from("groups")
    .select("id, name, max_participants, phase1_locked")
    .eq("invite_code", inviteCode)
    .single();

  if (!group) {
    return (
      <div className={styles.center}>
        <div className={styles.icon}>🤔</div>
        <h1 className={styles.title}>Invite not found</h1>
        <p className={styles.subtitle}>This invite link is invalid or has expired.</p>
      </div>
    );
  }

  // Member count via admin client
  const { count: memberCount } = await admin
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", group.id);

  // Check if user is already a member
  const { data: existing } = await admin
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) redirect(`/groups/${group.id}`);

  const isFull = (memberCount ?? 0) >= group.max_participants;

  return (
    <div className={styles.center}>
      <div className={styles.card}>
        <div className={styles.icon}>🏆</div>
        <h1 className={styles.title}>You&apos;re invited!</h1>
        <p className={styles.groupName}>{group.name}</p>
        <p className={styles.meta}>👥 {memberCount ?? 0} / {group.max_participants} participants</p>

        {isFull ? (
          <p className={styles.fullMsg}>This group is full. Ask the admin to increase the limit.</p>
        ) : (
          <JoinGroupButton groupId={group.id} groupName={group.name} />
        )}
      </div>
    </div>
  );
}
