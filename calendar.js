// calendar.js
import { db } from "./config.js"; // 🔹 Corrigido para importar de config.js
import {
  collection,
  getDocs,
  addDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// 🎨 Elementos da página
const addEventBtn = document.getElementById('addEventBtn');
const eventForm = document.getElementById('eventForm');
const saveEventBtn = document.getElementById('saveEventBtn');
const cancelEventBtn = document.getElementById('cancelEventBtn');
const groupSelect = document.getElementById('groupSelect');
const calendarEl = document.getElementById('calendar');
let filterSelect; // será criado dinamicamente
let calendar;
let groupColors = {};
let allEvents = [];

const auth = getAuth();

// 🧩 Espera o Firebase Auth carregar o estado do usuário
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.warn("Usuário não logado. Redirecionando...");
    window.location.href = "index.html";
    return;
  }

  console.log("Usuário logado:", user.uid);

  await loadGroups(user.uid);
  await loadAndRenderCalendar(user.uid);
});

// =======================================================
// 🔹 Carrega grupos do Firestore (do usuário logado)
// =======================================================
async function loadGroups(userId) {
  try {
    const q = query(collection(db, "groups"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    groupSelect.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.name) return;

      const color = data.color || getRandomColor();
      groupColors[docSnap.id] = color;

      // adiciona ao seletor do formulário
      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = data.name;
      option.style.color = color;
      groupSelect.appendChild(option);
    });

  } catch (err) {
    console.error("Erro ao carregar grupos:", err);
  }
}

// =======================================================
// 🔹 Carrega e exibe eventos
// =======================================================
async function loadAndRenderCalendar(userId) {
  allEvents = await loadEvents(userId);

  // cria o seletor de filtro
  createFilterSelect();

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'pt-br',
    height: 'auto',
    events: allEvents
  });

  calendar.render();
}

// =======================================================
// 📅 Carrega eventos existentes do usuário
// =======================================================
async function loadEvents(userId) {
  try {
    const q = query(collection(db, "events"), where("userId", "==", userId));
    const snapshot = await getDocs(q);

    const events = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const color = groupColors[data.groupId] || "#007bff";

      events.push({
        title: data.title,
        start: data.date,
        color: color,
        groupId: data.groupId
      });
    });

    return events;
  } catch (err) {
    console.error("Erro ao carregar eventos:", err);
    return [];
  }
}

// =======================================================
// 💾 Salvar novo evento
// =======================================================
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
    calendar.addEvent({ title, start: date, color, groupId });
    alert("Evento salvo!");
    eventForm.style.display = 'none';
  } catch (error) {
    console.error("Erro ao salvar evento:", error);
  }
});

// =======================================================
// 🧠 Mostrar/ocultar formulário
// =======================================================
addEventBtn.addEventListener('click', () => eventForm.style.display = 'block');
cancelEventBtn.addEventListener('click', () => eventForm.style.display = 'none');

// =======================================================
// 🎨 Cor padrão (apenas fallback, não usada em grupos com cor salva)
// =======================================================
function getRandomColor() {
  const colors = ["#007bff", "#28a745", "#ffc107", "#dc3545", "#17a2b8", "#6f42c1", "#fd7e14"];
  return colors[Math.floor(Math.random() * colors.length)];
}

// =======================================================
// 🔍 Filtro de grupos (criado dinamicamente)
// =======================================================
function createFilterSelect() {
  if (filterSelect) return; // evita recriar

  filterSelect = document.createElement("select");
  filterSelect.style.display = "block";
  filterSelect.style.margin = "20px auto";
  filterSelect.style.padding = "8px";
  filterSelect.style.borderRadius = "6px";
  filterSelect.style.border = "1px solid #ccc";

  // opção padrão
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Todos os grupos";
  filterSelect.appendChild(allOption);

  // opções por grupo
  for (const [id, color] of Object.entries(groupColors)) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = Object.values(groupSelect.options).find(o => o.value === id)?.text || "Grupo";
    opt.style.color = color;
    filterSelect.appendChild(opt);
  }

  // adiciona no topo do calendário
  calendarEl.parentNode.insertBefore(filterSelect, calendarEl);

  // evento de filtro
  filterSelect.addEventListener("change", () => {
    const selected = filterSelect.value;
    calendar.removeAllEvents();

    if (selected === "all") {
      allEvents.forEach(ev => calendar.addEvent(ev));
    } else {
      const filtered = allEvents.filter(ev => ev.groupId === selected);
      filtered.forEach(ev => calendar.addEvent(ev));
    }
  });
}
