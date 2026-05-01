// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Твой конфиг из Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCUQ6IZ-eoAG8qCq5yoRklIl34kVUNCq2U",
  authDomain: "crm-fifty.firebaseapp.com",
  projectId: "crm-fifty",
  storageBucket: "crm-fifty.firebasestorage.app",
  messagingSenderId: "37266175294",
  appId: "1:37266175294:web:42118a3130c5b3e88de86f"
};

// Инициализация
const app = initializeApp(firebaseConfig);

// Экспортируем нужные сервисы, чтобы использовать их в других файлах
export const auth = getAuth(app);
export const db = getFirestore(app);