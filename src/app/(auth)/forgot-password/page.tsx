"use client";

import { useState } from "react";
import Link from "next/link";
import { Oval } from "react-loader-spinner";
import { createClient } from "@/lib/supabase/client";
import styles from "../login/page.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <>
        <h1 className={styles.title}>Check your inbox ✉️</h1>
        <p className={styles.subtitle}>
          We sent a password reset link to <strong>{email}</strong>.
        </p>
        <p className={styles.spamNote}>
          Didn&apos;t see it? Check your spam folder.
        </p>
        <p className={styles.footer}>
          <Link href="/login">Back to sign in</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.title}>Forgot password?</h1>
      <p className={styles.subtitle}>Enter your email and we&apos;ll send a reset link.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className={styles.input}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <button type="submit" className={styles.submit} disabled={loading || !email}>
          {loading ? <Oval height={16} width={16} color="currentColor" strokeWidth={5} /> : "Send reset link"}
        </button>
      </form>

      <p className={styles.footer}>
        <Link href="/login">← Back to sign in</Link>
      </p>
    </>
  );
}
