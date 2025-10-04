import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Config do seu Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAm4kct4BJrVydJpcAXFZuHuEOAtnpUJfc",
    authDomain: "attendance-rb.firebaseapp.com",
    projectId: "attendance-rb",
    storageBucket: "attendance-rb.firebasestorage.app",
    messagingSenderId: "884478984062",
    appId: "1:884478984062:web:e64f5dedafb34ac7d73d2f"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const messageEl = document.getElementById("message");

// Redireciona usuário logado
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário logado -> redireciona
        window.location.href = "index.html";
    } else {
        // Nenhum usuário logado
        messageEl.textContent = "Faça login ou registre-se";
    }
});

// Função login
loginBtn.addEventListener("click", async() => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) return messageEl.textContent = "Preencha todos os campos";

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged vai redirecionar
    } catch (err) {
        messageEl.textContent = "Erro no login: " + err.message;
    }
});

// Função registro
registerBtn.addEventListener("click", async() => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) return messageEl.textContent = "Preencha todos os campos";

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged vai redirecionar
    } catch (err) {
        messageEl.textContent = "Erro no registro: " + err.message;
    }
});