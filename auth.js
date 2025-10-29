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


let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    // Se quiser redirecionar em login.html, continue aqui
    if (user && window.location.pathname.includes("login.html")) {
        window.location.href = "index.html";
    }
});

if (document.getElementById("loginBtn")) {
    const loginEmail = document.getElementById("loginEmail");
    const loginPassword = document.getElementById("loginPassword");
    const loginBtn = document.getElementById("loginBtn");
    const loginMsg = document.getElementById("loginMsg");


    // Redireciona usuário logado
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuário logado -> redireciona
            window.location.href = "groups.html";
        }
    });

    // Função login
    if (loginBtn) {
        loginBtn.addEventListener("click", async() => {
            try {
                await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
                // onAuthStateChanged vai redirecionar
            } catch (err) {
                loginMsg.textContent = "Erro no login: " + err.message;
            }
        });
    } else {
        console.error("Botão de login não encontrado no DOM!");
    }
};
if (document.getElementById("registerBtn")) {
    const registerEmail = document.getElementById("registerEmail");
    const registerPassword = document.getElementById("registerPassword");
    const registerBtn = document.getElementById("registerBtn");
    const registerMsg = document.getElementById("registerMsg");
    // Função registro
    if (registerBtn) {
        registerBtn.addEventListener("click", async() => {
            try {
                await createUserWithEmailAndPassword(auth, registerEmail.value, registerPassword.value);
                // onAuthStateChanged vai redirecionar
                console.log("Usuário registrado com sucesso");
            } catch (err) {
                registerMsg.textContent = "Erro no registro: " + err.message;
            }
        });
    } else {
        console.error("Botão de registro não encontrado no DOM!");
    }
};

// Função para outros módulos obterem o usuário atual
export function getCurrentUser() {
    return currentUser;
};
export { app, auth, db, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, getCurrentUser };
