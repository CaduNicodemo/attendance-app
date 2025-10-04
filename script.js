// script.js
import { auth, db } from "./config.js";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    setDoc,
    getDocs,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// exemplo de onAuthStateChanged
onAuthStateChanged(auth, (user) => {
    const loginSection = document.getElementById("loginSection");
    const mainApp = document.getElementById("mainApp");
    if (user) {
        if (loginSection) loginSection.style.display = "none";
        if (mainApp) mainApp.style.display = "block";
        loadGroups(); // sua função de carregar grupos
    } else {
        if (loginSection) loginSection.style.display = "flex";
        if (mainApp) mainApp.style.display = "none";
    }
});