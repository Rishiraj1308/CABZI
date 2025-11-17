"use client";

import { useFirebase } from "@/lib/firebase/client-provider";
import { doc, updateDoc } from "firebase/firestore";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, db, isUserLoading } = useFirebase();

  // Move your Firebase logic here.
  return <>{children}</>;
}
