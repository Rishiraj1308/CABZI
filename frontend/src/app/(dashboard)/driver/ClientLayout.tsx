"use client";

import { useFirebase } from "@/lib/firebase/client-provider";
import { doc, updateDoc, serverTimestamp, onSnapshot, GeoPoint } from "firebase/firestore";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, db, isUserLoading } = useFirebase();

  // All your previous client-side Firebase logic goes here.
  // NOT in server layout.

  return <>{children}</>;
}
