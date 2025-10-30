// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Config do Firebase
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

// Variável para armazenar o usuário atual
let currentUser = null;

// Observa mudanças de autenticação
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    console.log("Auth state changed:", user);
});

// Função para pegar o usuário atual
function getCurrentUser() {
    return currentUser;
}

// Login
if (document.getElementById("loginBtn")) {
    const loginEmail = document.getElementById("loginEmail");
    const loginPassword = document.getElementById("loginPassword");
    const loginBtn = document.getElementById("loginBtn");
    const loginMsg = document.getElementById("loginMsg");

    loginBtn.addEventListener("click", async () => {
           try {
        await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
        // Redireciona somente depois do login bem-sucedido
        window.location.href = "index.html";
    } catch (err) {
        loginMsg.textContent = "Erro no login: " + err.message;
    }
    });
}

// Registro
if (document.getElementById("registerBtn")) {
    const registerEmail = document.getElementById("registerEmail");
    const registerPassword = document.getElementById("registerPassword");
    const registerBtn = document.getElementById("registerBtn");
    const registerMsg = document.getElementById("registerMsg");

    registerBtn.addEventListener("click", async () => {
        try {
            await createUserWithEmailAndPassword(auth, registerEmail.value, registerPassword.value);
            console.log("Usuário registrado com sucesso");
        } catch (err) {
            registerMsg.textContent = "Erro no registro: " + err.message;
        }
    });
}

// Exporta tudo que será usado em outros módulos
export { 
    app, 
    auth, 
    db, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    getCurrentUser 
};
