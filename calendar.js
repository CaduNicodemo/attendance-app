import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Config Firebase (a mesma que você já usa)
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

// Função para carregar eventos do Firestore
async function loadEvents() {
  const snap = await getDocs(collection(db, "events"));
  const events = snap.docs.map(doc => {
    const data = doc.data();
    return {
      title: data.title,
      start: data.date.toDate(), // converte timestamp para Date
      description: data.description || "",
      group: data.group || ""
    };
  });
  return events;
}

// Inicializar o calendário
document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");
  const events = await loadEvents();

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    events: events,
    eventClick: function(info) {
      alert(`Evento: ${info.event.title}\nDescrição: ${info.event.extendedProps.description}`);
    }
  });

  calendar.render();
});
