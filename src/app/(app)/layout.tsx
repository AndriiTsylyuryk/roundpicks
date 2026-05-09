import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import FeedbackWidget from "@/components/FeedbackWidget";
import styles from "./layout.module.css";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <Link href="/dashboard" className={styles.brand}>
          <span className={styles.brandIcon}>⚽</span>
          Roundpics
        </Link>
        <div className={styles.navActions}>
          <span className={styles.navName}>
            {profile?.display_name ?? user.email}
          </span>
          <SignOutButton />
        </div>
      </nav>
      <main className={styles.main}>{children}</main>
      <FeedbackWidget />
    </div>
  );
}
