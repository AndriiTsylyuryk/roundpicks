"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function AuthListener() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("type=recovery")) return;

    const params = new URLSearchParams(hash.replace(/^#/, "?"));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken) return;

    const supabase = createClient();
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken ?? "",
    }).then(({ error }) => {
      if (error) return;
      window.history.replaceState(null, "", window.location.pathname);
      router.push("/reset-password");
    });
  }, [router]);

  return null;
}
