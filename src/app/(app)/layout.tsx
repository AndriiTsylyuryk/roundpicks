import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import SignOutButton from "@/components/SignOutButton";
import FeedbackWidget from "@/components/FeedbackWidget";
import { Logo } from "@/components/landing/Logo";
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

  const displayName = profile?.display_name ?? (() => {
    const fallback = user.email?.split("@")[0] ?? "User";
    const admin = createAdminClient();
    admin.from("profiles").upsert({ id: user.id, display_name: fallback }, { onConflict: "id" });
    return fallback;
  })();

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <Link href="/dashboard" className={styles.brand}>
          <Logo />
        </Link>
        <div className={styles.navActions}>
          <span className={styles.navName}>
            {displayName}
          </span>
          <SignOutButton />
        </div>
      </nav>
      <main className={styles.main}>{children}</main>
      <FeedbackWidget />
    </div>
  );
}
