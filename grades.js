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

let currentGroupName = localStorage.getItem("currentGroup");
let currentGroupData = null;

function getCategoriesForLevel(level) {
  switch (level) {
    case "Kids1":
    case "Kids2":
      return [
        "Participation in Class",
        "Language Comprehension",
        "Language Production",
        "Respects Rules",
        "Teamwork",
        "Homework",
        "Absences"
      ];
    case "Juniors":
    case "Juniors1":
    case "Juniors2":
      return [
        "Oral Test",
        "Writing",
        "Listening",
        "Final Project"
      ];
    case "TeensA":
    case "Teens1":
    case "Teens2":
    case "Teens3":
    case "Teens4":
    case "Teens5":
    case "Teens6":
      return [
        "Oral Test",
        "Writing",
        "Listening",
        "Reading",
        "Final Project"
      ];
    default:
      return ["Oral Test", "Final Project"];
  }
}

const concepts = ["AA","MT","ST","R"];

/* ---------------- Auth ---------------- */
onAuthStateChanged(auth, user => {
  if(!user) {
    alert("You must be logged in to access grades");
    window.location.href = "index.html";
  }
});
document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "index.html";
});


/* ---------------- Load Group Data ---------------- */
async function loadGroupGrades() {
  if(!currentGroupName) return alert("No group selected");

  const docRef = doc(db, "groups", currentGroupName);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
  currentGroupData = docSnap.data();
  document.getElementById("groupTitle").innerText = `Grades - ${currentGroupName}`;
  
  // 🔹 Define categories dinamicamente com base no level salvo no Firestore
  window.categories = getCategoriesForLevel(currentGroupData.level || "default");
  
  renderGradesTable();
}

  } else {
    alert("Group not found");
  }
}

/* ---------------- Render Table ---------------- */
function renderGradesTable() {
  const tbody = document.querySelector("#gradesTable tbody");
  tbody.innerHTML = "";
  currentGroupData.students.forEach((s,i) => {
    const row = tbody.insertRow();
    const nameCell = row.insertCell(0);
    nameCell.innerText = s.name;
    nameCell.style.cursor = "pointer";
    nameCell.addEventListener("click", ()=>openStudentPage(s.name));

    categories.forEach(cat => {
      const cell = row.insertCell();
      const select = document.createElement("select");
      concepts.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.innerText = c;
        select.appendChild(opt);
      });
      // Pre-fill existing grade if present
      if(s.grades && s.grades[cat]) select.value = s.grades[cat];
      cell.appendChild(select);
    });
  });
}

/* ---------------- Save Grades ---------------- */
document.getElementById("saveGradesBtn").addEventListener("click", async () => {
  const tbody = document.querySelector("#gradesTable tbody");
  tbody.querySelectorAll("tr").forEach((row,i)=>{
    const student = currentGroupData.students[i];
    if(!student.grades) student.grades = {};
    categories.forEach((cat,j)=>{
      const sel = row.cells[j+1].querySelector("select");
      student.grades[cat] = sel.value;
    });
  });
  const docRef = doc(db, "groups", currentGroupName);
  await updateDoc(docRef, { students: currentGroupData.students });
  alert("Grades saved!");
});

/* ---------------- Export to Excel ---------------- */
document.getElementById("exportExcelBtn").addEventListener("click", () => {
  let csv = "Student," + categories.join(",") + "\n";
  currentGroupData.students.forEach(s => {
    const line = [s.name];
    categories.forEach(cat => line.push(s.grades && s.grades[cat] ? s.grades[cat] : ""));
    csv += line.join(",") + "\n";
  });
  const blob = new Blob([csv], {type: "text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentGroupName}_grades.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

/* ---------------- Open individual student page ---------------- */
function openStudentPage(studentName){
  localStorage.setItem("currentStudent", studentName);
  window.location.href = "student.html"; // futura página para comentários individuais
}

/* ---------------- Init ---------------- */
loadGroupGrades();
