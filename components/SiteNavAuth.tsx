"use client";

import Link from "next/link";

import { useAuthUser } from "@/lib/auth/AuthUserContext";
import { href } from "@/lib/links";

import styles from "./SiteHeader.module.css";

export function SiteNavAuth() {
  const { configured, loading, userId } = useAuthUser();

  if (!configured) {
    return null;
  }

  if (userId) {
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
