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

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const loginMsg = document.getElementById("loginMsg");

const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");
const registerBtn = document.getElementById("registerBtn");
const registerMsg = document.getElementById("registerMsg");

// Redireciona usuário logado
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário logado -> redireciona
        window.location.href = "groups.html";
    }
});

// Função login
loginBtn.addEventListener("click", async() => {
    try {
        await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
        // onAuthStateChanged vai redirecionar
    } catch (err) {
        loginMsg.textContent = "Erro no login: " + err.message;
    }
});

// Função registro
registerBtn.addEventListener("click", async() => {
    try {
        await createUserWithEmailAndPassword(auth, registerEmail.value, registerPassword.value);
        // onAuthStateChanged vai redirecionar
        console.log("Usuário registrado com sucesso");
    } catch (err) {
        registerMsg.textContent = "Erro no registro: " + err.message;
    }
});
export { app, auth, db, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword };