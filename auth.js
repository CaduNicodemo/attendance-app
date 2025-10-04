// auth.js
import { auth, db } from "./config.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Elementos do DOM
const loginSection = document.getElementById("loginSection");
const registerSection = document.getElementById("registerSection");
const loginMsg = document.getElementById("loginMsg");
const registerMsg = document.getElementById("registerMsg");

// Mostrar/ocultar seções
document.getElementById("showRegister").addEventListener("click", e => {
    e.preventDefault();
    loginSection.style.display = "none";
    registerSection.style.display = "flex";
});

document.getElementById("showLogin").addEventListener("click", e => {
    e.preventDefault();
    registerSection.style.display = "none";
    loginSection.style.display = "flex";
});

// Login
document.getElementById("loginBtn").addEventListener("click", async() => {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        const userDoc = await getDoc(doc(db, "users", uid));
        if (!userDoc.exists()) {
            loginMsg.textContent = "Conta inválida. Contate o administrador.";
            await signOut(auth);
            return;
        }

        const role = userDoc.data().role;
        if (role === "pending") {
            loginMsg.textContent = "Aguardando aprovação do administrador.";
            await signOut(auth);
        } else if (role === "user" || role === "admin") {
            loginMsg.textContent = "";
            window.location.href = role === "admin" ? "admin.html" : "user.html";
        }

    } catch (error) {
        loginMsg.textContent = "Erro ao fazer login: " + error.message;
    }
});

// Registro
document.getElementById("registerBtn").addEventListener("click", async() => {
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (!name || !email || !password) {
        registerMsg.textContent = "Preencha todos os campos.";
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        await setDoc(doc(db, "users", uid), {
            name,
            email,
            role: "pending",
            createdAt: serverTimestamp()
        });

        registerMsg.style.color = "green";
        registerMsg.textContent = "Cadastro enviado! Aguarde aprovação.";
        await signOut(auth);

    } catch (error) {
        registerMsg.textContent = "Erro ao registrar: " + error.message;
    }
});