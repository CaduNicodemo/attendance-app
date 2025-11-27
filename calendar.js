import { db, auth } from "./config.js";
import {
  collection, addDoc, getDocs, query, where, onSnapshot, updateDoc, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";


let currentUser = null;
let editingEventId = null;
let calendar;
let allEvents = [];
let groupsData = {}; 

// =======================================================
// Espera login
// =======================================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;
  await loadGroups();   // ✅ espera carregar grupos e cores
  initCalendar();
  loadEvents();         // ✅ agora pode aplicar cores
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
    eventClick: (info) => {
      const ev = info.event;

      editingEventId = ev.id;

      document.getElementById("eventTitle").value = ev.title;
      document.getElementById("eventDate").value = ev.startStr;
      document.getElementById("groupSelect").value =
        ev.extendedProps.groupId;

      document.getElementById("eventForm").style.display = "block";
    }});
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
    const groupId = docSnap.id;

    // salva nome e cor do grupo
    groupsData[groupId] = g.color || "#6c757d";

    // preenche selects
    const opt1 = document.createElement("option");
    opt1.value = groupId;
    opt1.textContent = g.name;
    groupSelect.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = groupId;
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

document.getElementById("deleteEventBtn").addEventListener("click", async () => {
  if (!editingEventId) return; // nada a excluir

  const confirmDelete = confirm("Deseja excluir este evento?");
  if (!confirmDelete) return;

  await deleteDoc(doc(db, "events", editingEventId));

  clearForm();
  document.getElementById("eventForm").style.display = "none";
  editingEventId = null;
});


document.getElementById("saveEventBtn").addEventListener("click", async () => {
  const title = document.getElementById("eventTitle").value.trim();
  const date = document.getElementById("eventDate").value;
  const groupId = document.getElementById("groupSelect").value;

  if (!title || !date || !groupId) return alert("Preencha todos os campos!");

if (editingEventId) {
  await updateDoc(doc(db, "events", editingEventId), {
    title,
    date,
    groupId
  });
  editingEventId = null;
} else {
  await addDoc(collection(db, "events"), {
    userId: currentUser.uid,
    title,
    date,
    groupId,
  });
}

function clearForm() {
  document.getElementById("eventTitle").value = "";
  document.getElementById("eventDate").value = "";
  document.getElementById("groupSelect").value = "";
}

  loadEvents();
  clearForm();
document.getElementById("eventForm").style.display = "none";

});

// =======================================================
// Carrega eventos e aplica filtro
// =======================================================
// =======================================================
// Carrega eventos e aplica filtro
// =======================================================
async function loadEvents() {
  const q = query(collection(db, "events"), where("userId", "==", currentUser.uid));
  onSnapshot(q, (snapshot) => {
    allEvents = [];

    snapshot.forEach(docSnap => {
      const ev = docSnap.data();

      // resolve a variável CSS para cor real
      const colorVar = groupsData[ev.groupId] || "#6c757d";
      const resolvedColor = getComputedStyle(document.documentElement)
                            .getPropertyValue(colorVar)
                            .trim() || "#6c757d";

      allEvents.push({
        id: docSnap.id,
        title: ev.title,
        start: ev.date,
        groupId: ev.groupId,
        backgroundColor: resolvedColor,
        borderColor: resolvedColor,
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
