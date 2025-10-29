import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getCurrentUser } from "./auth.js";

// 🔥 Configuração do Firebase (a mesma do seu projeto)
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

const addEventBtn = document.getElementById('addEventBtn');
const eventForm = document.getElementById('eventForm');
const saveEventBtn = document.getElementById('saveEventBtn');
const cancelEventBtn = document.getElementById('cancelEventBtn');
const groupSelect = document.getElementById('groupSelect');
const eventList = document.getElementById('eventList');

// 🧑‍🏫 Mostrar formulário
addEventBtn.addEventListener('click', () => {
  eventForm.style.display = 'block';
});

// ❌ Cancelar
cancelEventBtn.addEventListener('click', () => {
  eventForm.style.display = 'none';
});

// 🔄 Carregar turmas do usuário
async function loadGroups() {
  const user = await getCurrentUser();
  if (!user) {
    eventList.innerHTML = "<li>Faça login para ver as turmas.</li>";
    return;
  }

  const querySnapshot = await getDocs(collection(db, "groups"));
  groupSelect.innerHTML = ""; // Limpa
  querySnapshot.forEach((doc) => {
    const group = doc.data();
    const option = document.createElement('option');
    option.value = doc.id;
    option.textContent = group.name || "Sem nome";
    groupSelect.appendChild(option);
  });
}

// 💾 Salvar evento
saveEventBtn.addEventListener('click', async () => {
  const title = document.getElementById('eventTitle').value;
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
    loadEvents();
  } catch (error) {
    console.error("Erro ao salvar evento:", error);
  }
});

// 📅 Carregar eventos
async function loadEvents() {
  const snapshot = await getDocs(collection(db, "events"));
  eventList.innerHTML = "";
  snapshot.forEach((doc) => {
    const event = doc.data();
    const li = document.createElement("li");
    li.textContent = `${event.title} - ${event.date}`;
    eventList.appendChild(li);
  });
}

// Inicializar
loadGroups();
loadEvents();
