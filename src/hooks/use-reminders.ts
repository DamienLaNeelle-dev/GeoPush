import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { subscribeToReminders } from "@/services/reminders/reminderService";
import { Reminder } from "@/types/reminder";

// Fournit les rappels de l'utilisateur connecté, déjà séparés en actifs / terminés.
export function useReminders() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setReminders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToReminders(
      uid,
      (data) => {
        setReminders(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [uid]);

  const active = useMemo(
    () => reminders.filter((r) => r.status === "active"),
    [reminders]
  );
  const done = useMemo(
    () => reminders.filter((r) => r.status === "done"),
    [reminders]
  );

  return { reminders, active, done, loading, error };
}
