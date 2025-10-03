/* ---------------- Firestore Setup ---------------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

/* ---------------- Auth ---------------- */
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("mainApp").style.display = "block";
    document.getElementById("topbar").style.display = "flex";
    document.getElementById("userInfo").innerText = `Logado como: ${user.email}`;
    loadGroups();
  } else {
    document.getElementById("loginSection").style.display = "flex";
    document.getElementById("mainApp").style.display = "none";
  }
});

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const pass  = document.getElementById("loginPassword").value.trim();
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch(err) {
    document.getElementById("loginMsg").innerText = err.message;
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth);
});

/* ---------------- Global Variables ---------------- */
let groups = [];
let currentGroupIndex = 0;

/* ---------------- Load Groups ---------------- */
async function loadGroups() {
  const snap = await getDocs(collection(db,"groups"));
  groups = snap.docs.map(d=>({ id:d.id, ...d.data() })).sort((a,b)=>a.order-b.order);
  renderGroupButtons();
  if(groups.length>0) selectGroup(0);
}

/* ---------------- Render Groups ---------------- */
function renderGroupButtons() {
  const container = document.getElementById("groupsButtons");
  container.innerHTML = "";
  groups.forEach((g,i)=>{
    const btn = document.createElement("div");
    btn.className = "group-button";
    btn.innerText = g.name;
    btn.addEventListener("click", ()=>selectGroup(i));
    btn.addEventListener("dblclick", ()=>openGradesPage(g));
    container.appendChild(btn);
  });
}

/* ---------------- Select Group ---------------- */
function selectGroup(i) {
  currentGroupIndex = i;
  renderStudents();
  renderClasses();
}

/* ---------------- Create Group ---------------- */
document.getElementById("addGroupBtn").addEventListener("click", async ()=>{
  const selectEl = document.getElementById("groupType");
  const level = selectEl.options[selectEl.selectedIndex].dataset.level;
  const typeName = selectEl.value;
  const name = document.getElementById("groupName").value.trim();
  if(!name) return alert("Type a group name");

  const fullName = `${typeName} - ${name}`;
  const newGroup = { name: fullName, level: level, students:[], classes:[], order: groups.length };
  await setDoc(doc(db,"groups",fullName), newGroup);
  groups.push({ id: fullName, ...newGroup });

  document.getElementById("groupName").value = "";
  renderGroupButtons();
  selectGroup(groups.length-1);
});

/* ---------------- Students ---------------- */
document.getElementById("addStudentBtn").addEventListener("click", async ()=>{
  const name = document.getElementById("studentName").value.trim();
  if(!name) return alert("Insert student's name");
  const g = groups[currentGroupIndex];
  g.students.push({name});
  await updateDoc(doc(db,"groups",g.name), {students: g.students});
  document.getElementById("studentName").value = "";
  renderStudents();
});

function renderStudents() {
  const g = groups[currentGroupIndex];
  const table = document.getElementById("studentsTable");
  table.innerHTML = "<tr><th>Name</th><th>Delete</th></tr>";
  g.students.forEach((s,i)=>{
    const row = table.insertRow();
    row.insertCell(0).innerText = s.name;
    const delBtn = document.createElement("button");
    delBtn.innerText = "Remove";
    delBtn.addEventListener("click", async ()=>{
      g.students.splice(i,1);
      await updateDoc(doc(db,"groups",g.name), {students:g.students});
      renderStudents();
    });
    row.insertCell(1).appendChild(delBtn);
  });
}

/* ---------------- Classes ---------------- */
document.getElementById("generateClassesBtn").addEventListener("click", async ()=>{
  const g = groups[currentGroupIndex];
  g.days = [];
  if(document.getElementById("mon").checked) g.days.push(1);
  if(document.getElementById("tue").checked) g.days.push(2);
  if(document.getElementById("wed").checked) g.days.push(3);
  if(document.getElementById("thu").checked) g.days.push(4);
  if(document.getElementById("fri").checked) g.days.push(5);
  if(g.days.length === 0) return alert("Select class days");

  const today = new Date();
  let end = new Date(today.getFullYear(),11,31);
  while(today <= end){
    const day = today.getDay();
    const dateStr = today.toISOString().slice(0,10);
    if(g.days.includes(day) && !isHoliday(dateStr)){
      if(!g.classes.find(c=>c.date===dateStr)){
        g.classes.push({
          date: dateStr,
          name: dateStr,
          records: g.students.map(s=>({name: s.name, attendance:false, homework:false}))
        });
      }
    }
    today.setDate(today.getDate()+1);
  }
  await updateDoc(doc(db,"groups",g.name), {classes:g.classes});
  renderClasses();
});

function renderClasses() {
  const g = groups[currentGroupIndex];
  const table = document.getElementById("classesTable");
  table.innerHTML="<tr><th>Date</th><th>Class</th><th>Register</th></tr>";
  g.classes.forEach((c,i)=>{
    const row = table.insertRow();
    row.insertCell(0).innerText = c.date;
    const nameInput = document.createElement("input");
    nameInput.value = c.name;
    nameInput.addEventListener("change", async ()=>{
      c.name = nameInput.value;
      await updateDoc(doc(db,"groups",g.name), {classes:g.classes});
    });
    row.insertCell(1).appendChild(nameInput);
    const regBtn = document.createElement("button");
    regBtn.innerText = "Register";
    row.insertCell(2).appendChild(regBtn);
  });
}

/* ---------------- Delete Group ---------------- */
document.getElementById("deleteGroupBtn").addEventListener("click", async ()=>{
  const g = groups[currentGroupIndex];
  if(confirm(`Delete group "${g.name}"?`)){
    await deleteDoc(doc(db,"groups",g.name));
    groups.splice(currentGroupIndex,1);
    if(groups.length>0) selectGroup(0);
    renderGroupButtons();
  }
});

/* ---------------- Open Grades ---------------- */
function openGradesPage(g){
  localStorage.setItem("currentGroup", g.name);
  window.location.href = "grades.html";
}

document.getElementById("openGradesBtn").addEventListener("click", ()=>{
  if(groups[currentGroupIndex]){
    openGradesPage(groups[currentGroupIndex]);
  } else {
    alert("Select a group first!");
  }
});

/* ---------------- Helpers ---------------- */
function isHoliday(dateStr){
  const holidays = ["2025-01-01","2025-02-25","2025-04-18","2025-04-21","2025-05-01",
                    "2025-06-19","2025-09-07","2025-10-12","2025-11-02","2025-11-15","2025-12-25"];
  return holidays.includes(dateStr);
}
