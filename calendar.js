import { db, auth } from "./config.js";
import {
  collection, addDoc, getDocs, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let currentUser = null;
let calendar;
let allEvents = [];

// =======================================================
// Espera login
// =======================================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;
  await loadGroups();
  initCalendar();
});

// =======================================================
// Inicializa calendário
// =======================================================
function initCalendar() {
  const calendarEl = document.getElementById("calendar");
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    events: [],
    eventDisplay: "block",
  });
  calendar.render();
}

// =======================================================
// Carrega grupos e popula selects
// =======================================================
async function loadGroups() {
  const q = query(collection(db, "groups"), where("userId", "==", currentUser.uid));
  const snapshot = await getDocs(q);

  const groupSelect = document.getElementById("groupSelect");
  const filterSelect = document.getElementById("filterSelect");
  groupSelect.innerHTML = `<option value="">Selecione o grupo</option>`;
  filterSelect.innerHTML = `<option value="all">Todos</option>`;

  snapshot.forEach(docSnap => {
    const g = docSnap.data();
    const opt1 = document.createElement("option");
    opt1.value = docSnap.id;
    opt1.textContent = g.name;
    groupSelect.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = docSnap.id;
    opt2.textContent = g.name;
    filterSelect.appendChild(opt2);
  });
}

// =======================================================
// Adicionar evento
// =======================================================
document.getElementById("addEventBtn").addEventListener("click", () => {
  document.getElementById("eventForm").style.display = "block";
});

document.getElementById("cancelEventBtn").addEventListener("click", () => {
  document.getElementById("eventForm").style.display = "none";
});

document.getElementById("saveEventBtn").addEventListener("click", async () => {
  const title = document.getElementById("eventTitle").value.trim();
  const date = document.getElementById("eventDate").value;
  const groupId = document.getElementById("groupSelect").value;

  if (!title || !date || !groupId) return alert("Preencha todos os campos!");

  await addDoc(collection(db, "events"), {
    userId: currentUser.uid,
    title,
    date,
    groupId,
  });

  document.getElementById("eventForm").reset();
  document.getElementById("eventForm").style.display = "none";

  loadEvents();
});

// =======================================================
// Carrega eventos e aplica filtro
// =======================================================
async function loadEvents() {
  const q = query(collection(db, "events"), where("userId", "==", currentUser.uid));
  onSnapshot(q, (snapshot) => {
    allEvents = [];
    snapshot.forEach(docSnap => {
      const ev = docSnap.data();
      allEvents.push({
        title: ev.title,
        start: ev.date,
        groupId: ev.groupId,
      });
    });
    renderFilteredEvents();
  });
}

// =======================================================
// Filtro
// =======================================================
const filterSelect = document.getElementById("filterSelect");
filterSelect.addEventListener("change", renderFilteredEvents);

function renderFilteredEvents() {
  if (!calendar) return;
  const selected = filterSelect.value;
  calendar.removeAllEvents();

  const filtered = selected === "all" ? allEvents : allEvents.filter(ev => ev.groupId === selected);
  filtered.forEach(ev => calendar.addEvent(ev));
}
