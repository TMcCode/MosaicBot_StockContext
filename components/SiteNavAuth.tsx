"use client";

import Link from "next/link";

import { useOptionalSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { href } from "@/lib/links";

import styles from "./SiteHeader.module.css";

export function SiteNavAuth() {
  const { configured, loading, user } = useOptionalSupabaseAuth();

  if (!configured) {
    return null;
  }

  if (user) {
    return (
      <span className={styles.authNav}>
        <Link href={href("/account")}>Account</Link>
      </span>
    );
  }

  return (
    <Link href={href("/sign-in")} className={styles.authNav} aria-busy={loading || undefined}>
      Sign in
    </Link>
  );
}
