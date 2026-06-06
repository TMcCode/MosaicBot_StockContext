"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { href } from "@/lib/links";

import styles from "../auth/auth.module.css";

export default function AccountPage() {
  const router = useRouter();
  const { configured, loading, user, signOut } = useSupabaseAuth();

  useEffect(() => {
    if (!configured || loading) return;
    if (!user) {
      router.replace(href("/sign-in"));
    }
  }, [configured, loading, user, router]);

  if (!configured) {
    return (
      <section className="card">
        <p className={styles.copy}>Sign-in is not configured on this deployment.</p>
      </section>
    );
  }

  if (loading || !user) {
    return (
      <section className="card">
        <p className={styles.copy}>Loading…</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Account</p>
        <h1 className={styles.title}>Signed in</h1>
        <p className={styles.copy}>
          <strong>{user.email}</strong>
        </p>
        <p className={styles.copy}>
          Read markers sync across devices. When a theme or ticker page gets a new{" "}
          <code>build_id</code>, it shows as unread again.
        </p>
        <p className={styles.footer}>
          <button
            type="button"
            className={styles.submit}
            onClick={() => void signOut().then(() => router.replace(href("/")))}
          >
            Sign out
          </button>
        </p>
        <p className={`${styles.footer} muted`}>
          <Link href={href("/")}>Home</Link>
          {" · "}
          <a href="https://stockthemes.ai/account/" rel="noopener noreferrer">
            stockthemes.ai account
          </a>
        </p>
      </div>
    </section>
  );
}
