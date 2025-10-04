// config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 🔹 Sua configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAm4kct4BJrVydJpcAXFZuHuEOAtnpUJfc",
  authDomain: "attendance-rb.firebaseapp.com",
  projectId: "attendance-rb",
  storageBucket: "attendance-rb.firebasestorage.app",
  messagingSenderId: "884478984062",
  appId: "1:884478984062:web:e64f5dedafb34ac7d73d2f"
};

// 🔹 Inicializa o app
const app = initializeApp(firebaseConfig);

// 🔹 Inicializa os serviços
const db = getFirestore(app);
const auth = getAuth(app);

// 🔹 Exporta para uso em outros módulos
export {
  db,
  auth,
  // Firestore
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  // Auth
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
