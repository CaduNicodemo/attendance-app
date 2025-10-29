import { db } from "./config.js";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getCurrentUser } from "./auth.js";

// Verifica se o usuário está logado
const user = getCurrentUser();
if (!user) {
  alert("Faça login para ver o calendário.");
  window.location.href = "index.html";
}

const eventList = document.getElementById("eventList");
const eventTitle = document.getElementById("eventTitle");
const eventDate = document.getElementById("eventDate");
const addEventBtn = document.getElementById("addEventBtn");
const backToHome = document.getElementById("backToHome");

// Função para carregar eventos
async function loadEvents() {
  eventList.innerHTML = "";
  const snap = await getDocs(collection(db, "events"));
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const li = document.createElement("li");
    li.textContent = `${data.date} — ${data.title}`;

    const delBtn = document.createElement("button");
    delBtn.textContent = "Excluir";
    delBtn.onclick = async () => {
      await deleteDoc(doc(db, "events", docSnap.id));
      loadEvents();
    };

    li.appendChild(delBtn);
    eventList.appendChild(li);
  });
}

// Adicionar novo evento
addEventBtn.onclick = async () => {
  const title = eventTitle.value.trim();
  const date = eventDate.value;
  if (!title || !date) return alert("Preencha o título e a data.");

  await addDoc(collection(db, "events"), { title, date });
  eventTitle.value = "";
  eventDate.value = "";
  loadEvents();
};

// Voltar ao index.html
backToHome.onclick = () => {
  window.location.href = "index.html";
};

// Carrega os eventos ao abrir a página
loadEvents();
