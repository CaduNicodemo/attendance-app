/* ---------------- Firestore Setup ---------------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAm4kct4BJrVydJpcAXFZuHuEOAtnpUJfc",
  authDomain: "attendance-rb.firebaseapp.com",
  projectId: "attendance-rb",
  storageBucket: "attendance-rb.firebasestorage.app",
  messagingSenderId: "884478984062",
  appId: "1:884478984062:web:e64f5dedafb34ac7d73d2f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ---------------- Estado de autenticação ---------------- */
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("mainApp").style.display = "block";
    loadGroups();
  } else {
    document.getElementById("loginSection").style.display = "flex";
    document.getElementById("mainApp").style.display = "none";
  }
});

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const pass  = document.getElementById("loginPassword").value.trim();
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    document.getElementById("loginMsg").innerText = "Erro: " + err.message;
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => signOut(auth));

/* ---------------- Variáveis globais ---------------- */
let groups = [];
let currentGroupIndex = 0;

/* ---------------- Helpers ---------------- */
function todayISO(){ return new Date().toISOString().slice(0,10); }
function daysDiff(d1,d2){ return Math.floor((new Date(d1)-new Date(d2))/(1000*60*60*24)); }
function isHoliday(dateStr){
  const holidays = [
    "2025-01-01","2025-02-25","2025-04-18","2025-04-21","2025-05-01",
    "2025-06-19","2025-09-07","2025-10-12","2025-11-02","2025-11-15","2025-12-25"
  ];
  return holidays.includes(dateStr);
}

/* ---------------- CRUD grupos, alunos, aulas ---------------- */
// (Mantive exatamente a sua lógica de createGroup, renderGroupButtons, selectGroup, deleteGroup, cleanupOldClasses, addStudent, removeStudent, renderStudents, generateClasses, renderClasses, openClass, saveClass, cancelOverlay, checkFlags, sendWhatsApp)

// ... [aqui entra todo o código que você já tinha, igualzinho, apenas movido para este arquivo]
