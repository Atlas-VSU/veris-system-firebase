import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase.config";

export type UserData = {
  uid: string;
  id?: string;
  name: string;
  email: string;
  avatar: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  facultyId?: string;
  accessLevel?: number;
  orgId?: string;
};

export function useAuth() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      try {
        if (authUser) {
          // Get additional user data from Firestore
          const userDocRef = doc(db, "users", authUser.uid);
          const userSnapshot = await getDoc(userDocRef);
          if (userSnapshot.exists()) {
            const firestoreData = userSnapshot.data();
            // Combine auth and Firestore data
            const uid = firestoreData.id || firestoreData.uid || userSnapshot.id || authUser.uid;
            const firstName = firestoreData.firstName || (firestoreData.name ? firestoreData.name.split(" ")[0] : "") || "";
            const lastName = firestoreData.lastName || (firestoreData.name ? firestoreData.name.split(" ").slice(1).join(" ") : "") || "";
            setUser({
              uid,
              id: uid,
              name: firestoreData.name || `${firstName} ${lastName}`.trim() || authUser.displayName || "User",
              email: authUser.email || firestoreData.email || "",
              avatar: authUser.photoURL || "",
              firstName,
              lastName,
              role: firestoreData.role || "user",
              facultyId: firestoreData.facultyId || "",
              accessLevel: firestoreData.accessLevel ?? 0,
              orgId: firestoreData.orgId || ""
            });
          } else {
            // Use auth data if Firestore document doesn't exist
            setUser({
              uid: authUser.uid,
              name: authUser.displayName || "User",
              email: authUser.email || "",
              avatar: authUser.photoURL || "",
              role: "user"
            });
          }
        } else {
          setUser(null);
        }
        setError(null);
      } catch (err) {
        console.error("Error in authentication hook:", err);
        setError(
          err instanceof Error ? err : new Error("Authentication error")
        );
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    // Clean up subscription
    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await auth.signOut();
  }

  return { user, loading, error, isAuthenticated: !!user, signOut };
}
