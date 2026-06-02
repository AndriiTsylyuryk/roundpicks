"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Oval } from "react-loader-spinner";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

export default function JoinGroupButton({ groupId, groupName }: { groupId: string; groupName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function join() {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { error: insertError } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: user.id });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push(`/groups/${groupId}`);
  }

  return (
    <>
      {error && <p className={styles.error}>{error}</p>}
      <button onClick={join} disabled={loading} className={styles.joinBtn}>
        {loading ? <Oval height={16} width={16} color="currentColor" strokeWidth={5} /> : `Join "${groupName}" →`}
      </button>
    </>
  );
}
