/* ---------------- Firestore Setup ---------------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

/* ---------------- Levels Config ---------------- */
const levelsConfig = {
  "Kids": {
    categories: [
      "Participation in Class",
      "Language Comprehension",
      "Language Production",
      "Respects Rules",
      "Teamwork",
      "Homework",
      "Absences"
    ],
    concepts: ["AA","MT","ST","R"],
    conceptLegend: "AA=Almost Always, MT=Most of Time, ST=Some of Time, R=Rarely"
  },
  "Juniors": {
    categories: [
      "Participation in Class",
      "Engage in Conversations and Respond Properly",
      "Engagement in Storytelling Activities",
      "Be Kind, Respectful, and Helpful",
      "Autonomy to do Tasks and Use Materials",
      "Regular Completion of Homework",
      "Use Keywords and Short Sentences in Writing",
      "Oral Spelling",
      "Absences"
    ],
    concepts: ["AA","MT","ST","R"],
    conceptLegend: "AA=Almost Always, MT=Most of Time, ST=Some of Time, R=Rarely"
  },
  "Juniors1-2": {
    categories: [
      "Participation in Class","Listening","Speaking","Reading","Writing",
      "Respects Rules","Cooperation with Peers","Works Independently",
      "Care with Material","Homework","Absences"
    ],
    concepts: ["E","VG","G","S","NI"],
    conceptLegend: "E=Excellent, VG=Very Good, G=Good, S=Satisfactory, NI=Needs Improvement"
  },
  "TeensA1-2": {
    categories: [
      "Participation in Class","Listening","Speaking","Reading","Writing",
      "Respects Rules","Cooperation with Peers","Works Independently",
      "Care with Material","Homework","Absences","Portfolio"
    ],
    concepts: ["E","VG","G","S","NI"],
    conceptLegend: "E=Excellent, VG=Very Good, G=Good, S=Satisfactory, NI=Needs Improvement"
  },
  "Teens3-6": {
    categories: [
      "Participation in Class","Listening","Speaking","Reading","Writing",
      "Respects Rules","Cooperation with Peers","Works Independently",
      "Care with Material","Homework","Absences","Portfolio","Project1","Project2"
    ],
    concepts: ["E","VG","G","S","NI"],
    conceptLegend: "E=Excellent, VG=Very Good, G=Good, S=Satisfactory, NI=Needs Improvement"
  }
};

/* ---------------- Auth ---------------- */
onAuthStateChanged(auth, user=>{
  if(!user){
    alert("You must be logged in to access grades");
    window.location.href="index.html";
  }
});

/* ---------------- Navigation ---------------- */
document.getElementById("backBtn").addEventListener("click", ()=>{
  window.location.href="index.html";
});

/* ---------------- Load Group ---------------- */
async function loadGroupGrades() {
  if(!currentGroupName) return alert("No group selected");

  const docRef = doc(db,"groups",currentGroupName);
  const docSnap = await getDoc(docRef);

  if(docSnap.exists()){
    currentGroupData = docSnap.data();
    document.getElementById("groupTitle").innerText = `Grades - ${currentGroupName}`;
    renderGradesTable();
  } else {
    alert("Group not found");
  }
}

/* ---------------- Render Table ---------------- */
function renderGradesTable() {
  const tbody = document.querySelector("#gradesTable tbody");
  tbody.innerHTML="";

  // Determine level configuration
  let level = currentGroupData.level || "Kids";
  if(level === "Kids1" || level === "Kids2") level = "Kids";
  if(level === "Juniors1" || level==="Juniors2") level = "Juniors1-2";
  const cfg = levelsConfig[level] || levelsConfig["Kids"];

  // Render header dynamically
  const theadRow = document.querySelector("#gradesTable thead tr");
  theadRow.innerHTML="<th>Student</th>";
  cfg.categories.forEach(c => {
    const th = document.createElement("th");
    th.innerText = c;
    theadRow.appendChild(th);
  });

  document.getElementById("conceptLegend").innerText = cfg.conceptLegend;

  currentGroupData.students.forEach((s,i)=>{
    const row = tbody.insertRow();
    const nameCell = row.insertCell(0);
    nameCell.innerText = s.name;

    cfg.categories.forEach(cat=>{
      const cell = row.insertCell();
      const select = document.createElement("select");
      cfg.concepts.forEach(c=>{
        const opt = document.createElement("option");
        opt.value = c;
        opt.innerText = c;
        select.appendChild(opt);
      });
      if(s.grades && s.grades[cat]) select.value = s.grades[cat];
      cell.appendChild(select);
    });
  });
}

/* ---------------- Save Grades ---------------- */
document.getElementById("saveGradesBtn").addEventListener("click", async ()=>{
  let level = currentGroupData.level || "Kids";
  if(level === "Kids1" || level === "Kids2") level = "Kids";
  if(level === "Juniors1" || level==="Juniors2") level = "Juniors1-2";
  const cfg = levelsConfig[level] || levelsConfig["Kids"];

  const tbody = document.querySelector("#gradesTable tbody");
  tbody.querySelectorAll("tr").forEach((row,i)=>{
    const student = currentGroupData.students[i];
    if(!student.grades) student.grades = {};
    cfg.categories.forEach((cat,j)=>{
      const sel = row.cells[j+1].querySelector("select");
      student.grades[cat] = sel.value;
    });
  });

  const docRef = doc(db,"groups",currentGroupName);
  await updateDoc(docRef, {students: currentGroupData.students});
  alert("Grades saved!");
});

/* ---------------- Export CSV ---------------- */
document.getElementById("exportExcelBtn").addEventListener("click", ()=>{
  let level = currentGroupData.level || "Kids";
  if(level === "Kids1" || level === "Kids2") level = "Kids";
  if(level === "Juniors1" || level==="Juniors2") level = "Juniors1-2";
  const cfg = levelsConfig[level] || levelsConfig["Kids"];

  let csv = "Student," + cfg.categories.join(",") + "\n";
  currentGroupData.students.forEach(s=>{
    const line = [s.name];
    cfg.categories.forEach(cat=>{
      line.push(s.grades && s.grades[cat] ? s.grades[cat] : "");
    });
    csv += line.join(",") + "\n";
  });

  const blob = new Blob([csv],{type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentGroupName}_grades.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

/* ---------------- Init ---------------- */
loadGroupGrades();
