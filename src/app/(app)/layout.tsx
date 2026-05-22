import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { DrawerProvider } from "@/lib/drawer-context";
import { AppShell } from "./AppShell";

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
    <DrawerProvider>
      <AppShell displayName={displayName}>
        {children}
      </AppShell>
    </DrawerProvider>
  );
}
