// calendar.js
import { db } from "./auth.js";
import {
  collection,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 🎨 Elementos da página
const addEventBtn = document.getElementById('addEventBtn');
const eventForm = document.getElementById('eventForm');
const saveEventBtn = document.getElementById('saveEventBtn');
const cancelEventBtn = document.getElementById('cancelEventBtn');
const groupSelect = document.getElementById('groupSelect');
let calendar;
let groupColors = {};

const auth = getAuth();

// 🧩 Espera o Firebase Auth carregar o estado do usuário
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.warn("Usuário não logado. Redirecionando...");
    window.location.href = "index.html";
    return;
  }

  console.log("Usuário logado:", user.uid);
  console.log("Firestore db:", db);

  await loadGroups();
  const events = await loadEvents();

  const calendarEl = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'pt-br',
    height: 'auto',
    events: events
  });
  calendar.render();
});

// 🔄 Carrega grupos do Firestore
async function loadGroups() {
  try {
    const snapshot = await getDocs(collection(db, "groups"));
    groupSelect.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const color = data.color || getRandomColor();
      groupColors[doc.id] = color;

      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = data.name || "Sem nome";
      option.style.color = color;
      groupSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Erro ao carregar grupos:", err);
  }
}

// 📅 Carrega eventos existentes
async function loadEvents() {
  try {
    const snapshot = await getDocs(collection(db, "events"));
    const events = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        title: data.title,
        start: data.date,
        color: groupColors[data.groupId] || "#007bff",
      });
    });
    return events;
  } catch (err) {
    console.error("Erro ao carregar eventos:", err);
    return [];
  }
}

// 💾 Salvar novo evento
saveEventBtn.addEventListener('click', async () => {
  const title = document.getElementById('eventTitle').value.trim();
  const date = document.getElementById('eventDate').value;
  const groupId = groupSelect.value;
  const user = auth.currentUser;

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

    const color = groupColors[groupId] || "#007bff";
    calendar.addEvent({ title, start: date, color });
    alert("Evento salvo!");
    eventForm.style.display = 'none';
  } catch (error) {
    console.error("Erro ao salvar evento:", error);
  }
});

// 🧠 Mostrar/ocultar formulário
addEventBtn.addEventListener('click', () => eventForm.style.display = 'block');
cancelEventBtn.addEventListener('click', () => eventForm.style.display = 'none');

// 🎨 Cor aleatória (caso grupo não tenha)
function getRandomColor() {
  const colors = ["#007bff", "#28a745", "#ffc107", "#dc3545", "#17a2b8", "#6f42c1", "#fd7e14"];
  return colors[Math.floor(Math.random() * colors.length)];
}
