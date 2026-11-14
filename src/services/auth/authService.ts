import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";

import { auth } from "../../config/firebase";

// Connexion utilisateur
export const login = async (email: string, password: string): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

// Inscription utilisateur (on déconnecte ensuite : l'utilisateur doit se connecter lui-même)
export const register = async (email: string, password: string): Promise<void> => {
  await createUserWithEmailAndPassword(auth, email, password);
  await signOut(auth);
};

// Déconnexion utilisateur
export const logout = async (): Promise<void> => {
  await signOut(auth);
};