"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !user) return null;

  const name = user.fullName || user.username || "User";
  const email = user.primaryEmailAddress?.emailAddress;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[var(--background)] text-[var(--foreground)]">
      
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="text-center space-y-2">
        <p className="text-lg font-semibold">👋 Hello, {name}</p>

        {email && (
          <p className="text-sm text-[var(--foreground)]/60">
            📧 {email}
          </p>
        )}
      </div>

      <UserButton />
    </div>
  );
}