// auth.js
import { auth } from "./config.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let currentUser = null;

// 🔸 Acompanha login
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  console.log("Auth state changed:", user?.email || "deslogado");
});

export function getCurrentUser() {
  return currentUser;
}

// 🔹 Login
if (document.getElementById("loginBtn")) {
  const email = document.getElementById("loginEmail");
  const password = document.getElementById("loginPassword");
  const msg = document.getElementById("loginMsg");

  document.getElementById("loginBtn").addEventListener("click", async () => {
    try {
      await signInWithEmailAndPassword(auth, email.value, password.value);
      window.location.href = "groups.html";
    } catch (err) {
      msg.textContent = "Erro no login: " + err.message;
    }
  });
}

// 🔹 Registro
if (document.getElementById("registerBtn")) {
  const email = document.getElementById("registerEmail");
  const password = document.getElementById("registerPassword");
  const msg = document.getElementById("registerMsg");

  document.getElementById("registerBtn").addEventListener("click", async () => {
    try {
      await createUserWithEmailAndPassword(auth, email.value, password.value);
      msg.textContent = "Conta criada com sucesso! Faça login.";
    } catch (err) {
      msg.textContent = "Erro no registro: " + err.message;
    }
  });
}
