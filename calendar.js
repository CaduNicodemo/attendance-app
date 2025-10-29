import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getCurrentUser } from "./auth.js";

// 🔥 Configuração Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAm4kct4BJrVydJpcAXFZuHuEOAtnpUJfc",
    authDomain: "attendance-rb.firebaseapp.com",
    projectId: "attendance-rb",
    storageBucket: "attendance-rb.firebasestorage.app",
    messagingSenderId: "884478984062",
    appId: "1:884478984062:web:e64f5dedafb34ac7d73d2f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🎨 Elementos da página
const addEventBtn = document.getElementById('addEventBtn');
const eventForm = document.getElementById('eventForm');
const saveEventBtn = document.getElementById('saveEventBtn');
const cancelEventBtn = document.getElementById('cancelEventBtn');
const groupSelect = document.getElementById('groupSelect');
let calendar;

// 🧩 Inicializa o calendário
document.addEventListener('DOMContentLoaded', async () => {
  const calendarEl = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'pt-br',
    height: 'auto',
    events: await loadEvents(),
  });
  calendar.render();

  loadGroups();
});

// 🔄 Carrega as turmas do Firestore
async function loadGroups() {
  const user = await getCurrentUser();
  if (!user) {
    alert("Faça login para criar eventos.");
    return;
  }

  const snapshot = await getDocs(collection(db, "groups"));
  groupSelect.innerHTML = "";
  snapshot.forEach((doc) => {
    const data = doc.data();
    const option = document.createElement('option');
    option.value = doc.id;
    option.textContent = data.name || "Sem nome";
    groupSelect.appendChild(option);
  });
}

// 📅 Carrega eventos do Firestore
async function loadEvents() {
  const snapshot = await getDocs(collection(db, "events"));
  const events = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    events.push({
      title: data.title,
      start: data.date,
      color: "#007bff"
    });
  });
  return events;
}

// 🧠 Mostrar/ocultar formulário
addEventBtn.addEventListener('click', () => eventForm.style.display = 'block');
cancelEventBtn.addEventListener('click', () => eventForm.style.display = 'none');

// 💾 Salvar evento
saveEventBtn.addEventListener('click', async () => {
  const title = document.getElementById('eventTitle').value.trim();
  const date = document.getElementById('eventDate').value;
  const groupId = groupSelect.value;
  const user = await getCurrentUser();

  if (!user) {
    alert("Faça login antes de criar um evento.");
    return;
  }

  if (!title || !date || !groupId) {
    alert("Preencha todos os campos.");
    return;
  }

  try {
    await addDoc(collection(db, "events"), {
      title,
      date,
      groupId,
      userId: user.uid,
      createdAt: new Date()
    });
    alert("Evento salvo!");
    eventForm.style.display = 'none';
    calendar.addEvent({ title, start: date, color: "#007bff" });
  } catch (error) {
    console.error("Erro ao salvar evento:", error);
  }
});
