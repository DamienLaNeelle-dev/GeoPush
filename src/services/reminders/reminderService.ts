import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Unsubscribe,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../config/firebase";
import { Reminder, ReminderInput } from "../../types/reminder";

// Chemin Firestore : users/{uid}/reminders/{reminderId}
const remindersCollection = (uid: string) =>
  collection(db, "users", uid, "reminders");

const reminderDoc = (uid: string, id: string) =>
  doc(db, "users", uid, "reminders", id);

// Les anciens rappels (étape 2) avaient un champ `category` : on le convertit en `categories`.
const toReminder = (id: string, data: any): Reminder =>
  ({
    ...data,
    id,
    categories: data.categories ?? (data.category ? [data.category] : []),
    places: data.places ?? [],
  }) as Reminder;

// Écoute en temps réel de tous les rappels de l'utilisateur.
export const subscribeToReminders = (
  uid: string,
  onData: (reminders: Reminder[]) => void,
  onError: (error: Error) => void
): Unsubscribe => {
  const q = query(remindersCollection(uid), orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => toReminder(d.id, d.data())));
    },
    onError
  );
};

export const createReminder = async (
  uid: string,
  input: ReminderInput
): Promise<void> => {
  await addDoc(remindersCollection(uid), {
    ...input,
    status: "active",
    createdAt: Date.now(),
    completedAt: null,
  });
};

export const updateReminder = async (
  uid: string,
  id: string,
  input: ReminderInput
): Promise<void> => {
  await updateDoc(reminderDoc(uid, id), { ...input });
};

export const setReminderDone = async (
  uid: string,
  id: string,
  done: boolean
): Promise<void> => {
  await updateDoc(reminderDoc(uid, id), {
    status: done ? "done" : "active",
    completedAt: done ? Date.now() : null,
  });
};

export const deleteReminder = async (uid: string, id: string): Promise<void> => {
  await deleteDoc(reminderDoc(uid, id));
};
