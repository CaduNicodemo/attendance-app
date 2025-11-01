import { db, app } from "./config.js";
import {
  collection, addDoc, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const addEventBtn = document.getElementById('addEventBtn');
const eventForm = document.getElementById('eventForm');
const saveEventBtn = document.getElementById('saveEventBtn');
const cancelEventBtn = document.getElementById('cancelEventBtn');
const groupSelect = document.getElementById('groupSelect');
const calendarEl = document.getElementById('calendar');
let filterSelect;
let calendar;
let groupColors = {};
let allEvents = [];

const auth = getAuth(app);

// =======================================================
// 🔐 Inicialização com autenticação
// =======================================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  await loadGroups(user.uid);
  renderCalendar();
  watchEventsRealtime(user.uid);
});

// =======================================================
// 🔹 Carrega grupos do Firestore
// =======================================================
async function loadGroups(userId) {
  const q = query(collection(db, "groups"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  groupSelect.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const color = data.color || getRandomColor();
    groupColors[docSnap.id] = color;

    const option = document.createElement("option");
    option.value = docSnap.id;
    option.textContent = data.name;
    option.style.color = color;
    groupSelect.appendChild(option);
  });
}

// =======================================================
// 🕒 Atualização em tempo real dos eventos
// =======================================================
function watchEventsRealtime(userId) {
  const q = query(collection(db, "events"), where("userId", "==", userId));

  onSnapshot(q, (snapshot) => {
    allEvents = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      allEvents.push({
        title: data.title,
        start: data.date,
        color: groupColors[data.groupId] || "#007bff",
        groupId: data.groupId,
      });
    });

    updateCalendar();
  });
}

// =======================================================
// 📅 Renderiza e atualiza calendário
// =======================================================
function renderCalendar() {
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'pt-br',
    height: 'auto',
    events: allEvents,
  });
  calendar.render();
  createFilterSelect();
}

function updateCalendar() {
  if (!calendar) return;
  calendar.removeAllEvents();

  const selected = filterSelect?.value || "all";
  const toShow = selected === "all"
    ? allEvents
    : allEvents.filter(ev => ev.groupId === selected);

  toShow.forEach(ev => calendar.addEvent(ev));
}

// =======================================================
// 💾 Salvar evento
// =======================================================
saveEventBtn.addEventListener('click', async () => {
  const title = document.getElementById('eventTitle').value.trim();
  const date = document.getElementById('eventDate').value;
  const groupId = groupSelect.value;
  const user = auth.currentUser;

  if (!user || !title || !date || !groupId) {
    alert("Preencha todos os campos.");
    return;
  }

  await addDoc(collection(db, "events"), {
    title,
    date,
    groupId,
    userId: user.uid,
    createdAt: new Date(),
  });

  eventForm.style.display = 'none';
});

// =======================================================
// 🎨 Utilitários
// =======================================================
function getRandomColor() {
  const colors = ["#007bff", "#28a745", "#ffc107", "#dc3545", "#17a2b8", "#6f42c1", "#fd7e14"];
  return colors[Math.floor(Math.random() * colors.length)];
}

// =======================================================
// 🔍 Filtro de grupos
// =======================================================
function createFilterSelect() {
  filterSelect = document.createElement("select");
  filterSelect.style.display = "block";
  filterSelect.style.margin = "20px auto";
  filterSelect.style.padding = "8px";
  filterSelect.style.borderRadius = "6px";
  filterSelect.style.border = "1px solid #ccc";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Todos os grupos";
  filterSelect.appendChild(allOption);

  for (const [id, color] of Object.entries(groupColors)) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = groupSelect.querySelector(`option[value="${id}"]`)?.textContent || "Grupo";
    opt.style.color = color;
    filterSelect.appendChild(opt);
  }

  calendarEl.parentNode.insertBefore(filterSelect, calendarEl);
  filterSelect.addEventListener("change", updateCalendar);
}

addEventBtn.addEventListener('click', () => eventForm.style.display = 'block');
cancelEventBtn.addEventListener('click', () => eventForm.style.display = 'none');
