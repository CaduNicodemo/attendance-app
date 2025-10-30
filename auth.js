// auth.js
import { auth, db } from "./config.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Variável global para armazenar o usuário atual
let currentUser = null;

// --- Observa mudanças na autenticação ---
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  console.log("Auth state changed:", user);

// --- Pega o usuário atual ---
export function getCurrentUser() {
  return currentUser;
}

// --- Login ---
if (document.getElementById("loginBtn")) {
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginBtn = document.getElementById("loginBtn");
  const loginMsg = document.getElementById("loginMsg");

  loginBtn.addEventListener("click", async () => {
    try {
      console.log("Tentando login com:", loginEmail.value, loginPassword.value);
      await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
      console.log("Login bem sucediso")
      window.location.href = "calendar.html";
    } catch (err) {
      console.error("Erro no login:", err);
      loginMsg.textContent = "Erro no login: " + err.message;
    }
  });
}

// --- Registro ---
if (document.getElementById("registerBtn")) {
  const registerEmail = document.getElementById("registerEmail");
  const registerPassword = document.getElementById("registerPassword");
  const registerBtn = document.getElementById("registerBtn");
  const registerMsg = document.getElementById("registerMsg");

  registerBtn.addEventListener("click", async () => {
    try {
      await createUserWithEmailAndPassword(auth, registerEmail.value, registerPassword.value);
      registerMsg.textContent = "Conta criada com sucesso! Faça login.";
    } catch (err) {
      console.error("Erro no registro:", err);
      registerMsg.textContent = "Erro no registro: " + err.message;
    }
  });
}

export { auth, db };
