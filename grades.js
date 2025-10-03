/* ---------------- Firestore Setup ---------------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const auth = getAuth(app);

/* ---------------- Variáveis globais ---------------- */
let currentGroupName = localStorage.getItem("currentGroup");
let currentGroupData = null;

const groupCategories = {
  Kids: {
    categories: [
      "PARTICIPATION IN CLASS",
      "LANGUAGE COMPREHENSION",
      "LANGUAGE PRODUCTION",
      "RESPECTS RULES",
      "TEAMWORK",
      "HOMEWORK",
      "ABSENCES"
    ],
    concepts: conceptsKids
  },

  Juniors: {
    categories: [
      "PARTICIPATION IN CLASS",
      "ENGAGE IN CONVERSATIONS AND RESPOND PROPERLY",
      "ENGAGEMENT IN STORYTELLING ACTIVITIES",
      "BE KIND, RESPECTFUL, AND HELPFUL",
      "AUTONOMY TO DO TASKS AND USE MATERIALS",
      "REGULAR COMPLETION OF HOMEWORK",
      "USE KEYWORDS AND SHORT SENTENCES IN WRITING",
      "ORAL SPELLING",
      "ABSENCES"
    ],
    concepts: conceptsJuniors
  },

  Juniors1_2: {
    categories: [
      "PARTICIPATION IN CLASS",
      "LISTENING",
      "SPEAKING",
      "READING",
      "WRITING",
      "RESPECTS RULES",
      "COOPERATION WITH PEERS",
      "WORKS INDEPENDENTLY OF THE TEACHER",
      "CARE WITH MATERIAL",
      "HOMEWORK",
      "ABSENCES"
    ],
    concepts: conceptsJuniors12,
    tests: ["LISTENING TEST", "READING & UoE TEST", "WRITING TEST", "SPEAKING TEST"]
  },

  TeensA1_2: {
    categories: [
      "PARTICIPATION IN CLASS",
      "LISTENING",
      "SPEAKING",
      "READING",
      "WRITING",
      "RESPECTS RULES",
      "COOPERATION WITH PEERS",
      "WORKS INDEPENDENTLY OF THE TEACHER",
      "CARE WITH MATERIAL",
      "HOMEWORK",
      "ABSENCES",
      "PORTFOLIO 1"
      "PORTFOLIO 2"
      "PORTFOLIO 3"
      "PORTFOLIO 4"
      "PORTFOLIO 5"
      "PORTFOLIO 6"
      "PORTFOLIO 7"
    ],
    concepts: conceptsTeens,
    tests: ["LISTENING TEST", "READING & UoE TEST", "WRITING TEST", "SPEAKING TEST"]
  },

  Teens3_6: {
    categories: [
      "PARTICIPATION IN CLASS",
      "LISTENING",
      "SPEAKING",
      "READING",
      "WRITING",
      "RESPECTS RULES",
      "COOPERATION WITH PEERS",
      "WORKS INDEPENDENTLY OF THE TEACHER",
      "CARE WITH MATERIAL",
      "HOMEWORK",
      "ABSENCES",
      "PORTFOLIO 1"
      "PORTFOLIO 2"
      "PORTFOLIO 3"
      "PORTFOLIO 4"
      "PORTFOLIO 5"
      "PORTFOLIO 6"
      "PORTFOLIO 7"
      "PORTFOLIO 8"
      "PORTFOLIO 9"
      "PORTFOLIO 10"
      "PROJECT 1",
      "PROJECT 2"
    ],
    concepts: conceptsTeens,
    tests: ["LISTENING TEST", "READING & UoE TEST", "WRITING TEST", "SPEAKING TEST"]
  }
};

const conceptsKids = ["AA", "MT", "ST", "R"];
const conceptsJuniors = ["AA", "MT", "ST", "R"];
const conceptsJuniors12 = ["E", "VG", "G", "S", "NI"];
const conceptsTeens = ["E", "VG", "G", "S", "NI"];
/* ---------------- Auth ---------------- */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("You must be logged in to access grades");
    window.location.href = "index.html";
  }
});

/* ---------------- Botão Home ---------------- */
const backBtn = document.getElementById("backBtn");
if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

/* ---------------- Load Group Data ---------------- */
async function loadGroupGrades() {
  if (!currentGroupName) {
    alert("No group selected");
    return;
  }

  try {
    const docRef = doc(db, "groups", currentGroupName);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      currentGroupData = docSnap.data();
      document.getElementById("groupTitle").innerText = `Grades - ${currentGroupName}`;
      renderGradesTable();
    } else {
      alert("Group not found in Firestore");
    }
  } catch (err) {
    console.error("Error loading group:", err);
  }
}

/* ---------------- Render Table ---------------- */
function renderGradesTable() {
  if (!currentGroupData || !currentGroupData.students) return;

  const tbody = document.querySelector("#gradesTable tbody");
  tbody.innerHTML = "";

  currentGroupData.students.forEach((s) => {
    const row = tbody.insertRow();

    // Nome do aluno
    const nameCell = row.insertCell(0);
    nameCell.innerText = s.name;
    nameCell.style.cursor = "pointer";
    nameCell.addEventListener("click", () => openStudentPage(s.name));

    // Categorias
    categories.forEach((cat) => {
      const cell = row.insertCell();
      const select = document.createElement("select");

      concepts.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.innerText = c;
        select.appendChild(opt);
      });

      // Preencher se já existir nota
      if (s.grades && s.grades[cat]) {
        select.value = s.grades[cat];
      }

      cell.appendChild(select);
    });
  });
}

/* ---------------- Save Grades ---------------- */
const saveBtn = document.getElementById("saveGradesBtn");
if (saveBtn) {
  saveBtn.addEventListener("click", async () => {
    if (!currentGroupData) return;

    const tbody = document.querySelector("#gradesTable tbody");
    tbody.querySelectorAll("tr").forEach((row, i) => {
      const student = currentGroupData.students[i];
      if (!student.grades) student.grades = {};

      categories.forEach((cat, j) => {
        const sel = row.cells[j + 1].querySelector("select");
        student.grades[cat] = sel.value;
      });
    });

    try {
      const docRef = doc(db, "groups", currentGroupName);
      await updateDoc(docRef, { students: currentGroupData.students });
      alert("Grades saved!");
    } catch (err) {
      console.error("Error saving grades:", err);
    }
  });
}

/* ---------------- Export CSV ---------------- */
const exportBtn = document.getElementById("exportExcelBtn");
if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    if (!currentGroupData) return;

    let csv = "Student," + categories.join(",") + "\n";
    currentGroupData.students.forEach((s) => {
      const line = [s.name];
      categories.forEach((cat) =>
        line.push(s.grades && s.grades[cat] ? s.grades[cat] : "")
      );
      csv += line.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentGroupName}_grades.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

/* ---------------- Student Page ---------------- */
function openStudentPage(studentName) {
  localStorage.setItem("currentStudent", studentName);
  window.location.href = "student.html"; // futura página
}

/* ---------------- Init ---------------- */
loadGroupGrades();
