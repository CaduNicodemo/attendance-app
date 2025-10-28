// config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAm4kct4BJrVydJpcAXFZuHuEOAtnpUJfc",
    authDomain: "attendance-rb.firebaseapp.com",
    projectId: "attendance-rb",
    storageBucket: "attendance-rb.firebasestorage.app",
    messagingSenderId: "884478984062",
    appId: "1:884478984062:web:e64f5dedafb34ac7d73d2f"
};

const app = initializeApp(firebaseConfig);
const calendarBtn = document.getElementById("calendarButton");
const calendarMsg = document.getElementById("calendarMessage");

onAuthStateChanged(auth, (user) => {
  if (user) {
    calendarBtn.addEventListener("click", () => {
      window.location.href = "calendar.html";
    });
    calendarMsg.style.display = "none";
    calendarBtn.style.display = "inline-block";
  } else {
    calendarBtn.style.display = "none";
    calendarMsg.style.display = "block";
    calendarMsg.textContent = "Faça login para acessar o calendário.";
  }
}
export const auth = getAuth(app);
export const db = getFirestore(app);
