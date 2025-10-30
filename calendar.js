import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getCurrentUser, db } from "./auth.js";

const user = getCurrentUser();
if (!user) {
    alert("Faça login");
}

// 🎨 Elementos da página
const addEventBtn = document.getElementById('addEventBtn');
const eventForm = document.getElementById('eventForm');
const saveEventBtn = document.getElementById('saveEventBtn');
const cancelEventBtn = document.getElementById('cancelEventBtn');
const groupSelect = document.getElementById('groupSelect');
let calendar;
let groupColors = {}; // guardará cores das turmas

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

  await loadGroups(); // carrega grupos e cores
});

// 🔄 Carrega as turmas do Firestore e suas cores
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

    // define uma cor padrão se o grupo não tiver uma
    const color = data.color || getRandomColor();
    groupColors[doc.id] = color;

    const option = document.createElement('option');
    option.value = doc.id;
    option.textContent = data.name || "Sem nome";
    option.style.color = color;
    groupSelect.appendChild(option);
  });
}

// 📅 Carrega eventos e aplica cores de grupos
async function loadEvents() {
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
}

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

// 🎨 Gerador de cor aleatória (para grupos sem cor definida)
function getRandomColor() {
  const colors = ["#007bff", "#28a745", "#ffc107", "#dc3545", "#17a2b8", "#6f42c1", "#fd7e14"];
  return colors[Math.floor(Math.random() * colors.length)];
}
