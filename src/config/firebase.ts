import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAA-UZysyg_N3RmvmYiZjYR54oXdShzNoU",
  authDomain: "geopush-d74a8.firebaseapp.com",
  projectId: "geopush-d74a8",
  storageBucket: "geopush-d74a8.firebasestorage.app",
  messagingSenderId: "734022434325",
  appId: "1:734022434325:web:71bf7a18c8b4980f63581c",
};

const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

export const auth = isFirstInit
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);

export const db = getFirestore(app);
