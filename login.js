import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

// Config do seu Firebase
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_AUTH_DOMAIN",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_STORAGE_BUCKET",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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