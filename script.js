/* ---------------- Firestore Setup ---------------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

/* ---------------- Estado de autenticação ---------------- */
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
    document.getElementById("topbar").style.display = "none";
  }
});

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const pass  = document.getElementById("loginPassword").value.trim();
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    document.getElementById("loginMsg").innerText = "Erro: " + err.message;
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth).catch((err) => console.error("Erro ao sair:", err));
});

/* ---------------- Variáveis globais ---------------- */
let groups = [];
let currentGroupIndex = 0;

/* ---------------- Helpers ---------------- */
function todayISO(){ return new Date().toISOString().slice(0,10); }
function daysDiff(d1,d2){ return Math.floor((new Date(d1)-new Date(d2))/(1000*60*60*24)); }
function isHoliday(dateStr){
  const holidays = [
    "2025-01-01","2025-02-25","2025-04-18","2025-04-21","2025-05-01",
    "2025-06-19","2025-09-07","2025-10-12","2025-11-02","2025-11-15","2025-12-25"
  ];
  return holidays.includes(dateStr);
}

/* ---------------- Carregar grupos ---------------- */
async function loadGroups(){
  const snap = await getDocs(collection(db,"groups"));
  groups = [];
  snap.forEach(docSnap=>{
    groups.push({ id: docSnap.id, ...docSnap.data()});
  });
  groups.sort((a,b)=>a.order-b.order);
  renderGroupButtons();
  if(groups.length>0) selectGroup(0);
}

/* ---------------- Grupos ---------------- */
async function createGroup(){
  const levelSelect = document.getElementById("groupType"); // usa o select correto
  const level = levelSelect ? levelSelect.value : "Kids";   // pega o valor selecionado
  const name = document.getElementById("groupName").value.trim();
  if(!name) return alert("Name your group");

  const fullName = `${level} ${name}`; // Ex: "T6 Morning"
  const newGroup = { 
    name: fullName, 
    students:[], 
    classes:[], 
    days:[], 
    order: groups.length, 
    level 
  };

  await setDoc(doc(db,"groups",fullName), newGroup);
  groups.push({ id: fullName, ...newGroup});
  document.getElementById("groupName").value="";
  renderGroupButtons();
  selectGroup(groups.length-1);
}

function renderGroupButtons(){
  const container = document.getElementById("groupsButtons");
  container.innerHTML="";
  groups.sort((a,b)=>a.order-b.order).forEach((g,i)=>{
    const btn = document.createElement("div");
    btn.className="group-button";
    btn.draggable = true;
    btn.dataset.index = i;
    btn.style.backgroundColor = `hsl(200,60%,${40+40*(i/Math.max(groups.length-1,1))}%)`;
    btn.innerText = g.name;
    btn.addEventListener("click", ()=>selectGroup(i));

    // Clique duplo abre a página de notas
    btn.addEventListener("dblclick", () => {
      openGradesPage(g);
    });

    // Drag & Drop
    btn.addEventListener("dragstart", e=>{
      e.dataTransfer.setData("index", i);
    });
    btn.addEventListener("dragover", e=>e.preventDefault());
    btn.addEventListener("drop", async e=>{
      const from = +e.dataTransfer.getData("index");
      const to = i;
      const moved = groups.splice(from,1)[0];
      groups.splice(to,0,moved);
      groups.forEach((g,idx)=>g.order=idx);
      for(const g of groups){
        await updateDoc(doc(db,"groups",g.name),{order:g.order});
      }
      renderGroupButtons();
    });

    container.appendChild(btn);
  });
}

function selectGroup(i){
  currentGroupIndex = i;
  cleanupOldClasses(groups[i]);
  renderStudents();
  renderClasses();
  checkFlags();
}

/* ---------------- Delete Group ---------------- */
async function deleteGroup(){
  if(!groups[currentGroupIndex]) return;
  const g = groups[currentGroupIndex];
  if(confirm(`Delete group "${g.name}"?`)){
    await deleteDoc(doc(db,"groups",g.id));
    groups.splice(currentGroupIndex,1);
    currentGroupIndex=0;
    renderGroupButtons();
    if(groups.length>0) selectGroup(0);
    else {
      document.getElementById("studentsTable").innerHTML="<tr><th>Students</th><th>Remove Student</th></tr>";
      document.getElementById("classesTable").innerHTML="<tr><th>Date</th><th>Name</th><th>Register</th></tr>";
      document.getElementById("notificationSection").style.display="none";
    }
  }
}

/* ---------------- Classes e alunos ---------------- */
async function cleanupOldClasses(g){
  const hoje = todayISO();
  const limite = -10;
  const novas = g.classes.filter(c => daysDiff(c.date,hoje) >= limite);
  if(novas.length !== g.classes.length){
    g.classes = novas;
    await updateDoc(doc(db,"groups",g.name),{classes:g.classes});
  }
}

async function addStudent(){
  const name = document.getElementById("studentName").value.trim();
  if(!name) return alert("Insert student's name");
  const g = groups[currentGroupIndex];
  g.students.push({name});
  const hoje = todayISO();
  g.classes.forEach(c=>{
    if(c.date >= hoje && !c.records.find(r=>r.name===name)){
      c.records.push({ name, attendance:false, homework:false });
    }
  });
  await updateDoc(doc(db,"groups",g.name),{students:g.students, classes:g.classes});
  document.getElementById("studentName").value="";
  renderStudents();
  renderClasses();
}

async function removeStudent(index){
  const g = groups[currentGroupIndex];
  const removed = g.students.splice(index,1)[0];
  g.classes.forEach(c=>{
    c.records = c.records.filter(r=>r.name !== removed.name);
  });
  await updateDoc(doc(db,"groups",g.name),{students:g.students, classes:g.classes});
  renderStudents();
  renderClasses();
}

/* ---------------- Render Alunos ---------------- */
function renderStudents(){
  const g = groups[currentGroupIndex];
  const t = document.getElementById("studentsTable");
  t.innerHTML=`<tr><th colspan="2">${g ? g.name : ""}</th></tr><tr><th>Name</th><th>Remove</th></tr>`;
  if(!g) return;
  g.students.forEach((s,i)=>{
    const row = t.insertRow();
    row.insertCell(0).innerText=s.name;
    const btnCell=row.insertCell(1);
    const btn=document.createElement("button");
    btn.innerText="Remover";
    btn.addEventListener("click", ()=>removeStudent(i));
    btnCell.appendChild(btn);
  });
}

/* ---------------- Classes ---------------- */
async function generateClasses(){
  const g = groups[currentGroupIndex];
  if(!g) return alert("Select a group");
  g.days = [];
  if(document.getElementById("mon").checked) g.days.push(1);
  if(document.getElementById("tue").checked) g.days.push(2);
  if(document.getElementById("wed").checked) g.days.push(3);
  if(document.getElementById("thu").checked) g.days.push(4);
  if(document.getElementById("fri").checked) g.days.push(5);
  if(g.days.length===0) return alert("Select class days");

  let d = new Date();
  let end = new Date(new Date().getFullYear(),11,31);
  while(d<=end){
    const day = d.getDay();
    const dateStr = d.toISOString().slice(0,10);
    if(g.days.includes(day) && !isHoliday(dateStr)){
      if(!g.classes.find(c=>c.date===dateStr)){
        g.classes.push({
          date: dateStr,
          name: dateStr,
          completed: false,
          records: g.students.map(s=>({ name: s.name, attendance:false, homework:false }))
        });
      }
    }
    d.setDate(d.getDate()+1);
  }
  g.classes.sort((a,b)=>a.date.localeCompare(b.date));
  await updateDoc(doc(db,"groups",g.name),{days:g.days, classes:g.classes});
  renderClasses();
}

function formatDateBR(dateStr) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function renderClasses(){
  const g = groups[currentGroupIndex];
  const t = document.getElementById("classesTable");
  t.innerHTML=`<tr><th>Date</th><th>Name</th><th>Register</th></tr>`;
  if(!g) return;
  const hoje = todayISO();
  g.classes.forEach((c,i)=>{
    const row = t.insertRow();
    if(c.date===hoje) row.classList.add("today-class");
    row.insertCell(0).innerText = formatDateBR(c.date);
    const nameCell=row.insertCell(1);
    const inp=document.createElement("input");
    inp.type="text"; inp.value=c.name||c.date;
    inp.addEventListener("change",async e=>{
      c.name=e.target.value.trim()||c.date;
      await updateDoc(doc(db,"groups",g.name),{classes:g.classes});
    });
    nameCell.appendChild(inp);

    const cell=row.insertCell(2);
    const mark=document.createElement("button");
    mark.innerText="Register";
    mark.addEventListener("click", ()=>openClass(i));
    const del=document.createElement("button");
    del.innerText="Delete Class";
    del.addEventListener("click", async ()=>{
      g.classes.splice(i,1);
      await updateDoc(doc(db,"groups",g.name),{classes:g.classes});
      renderClasses();
    });
    cell.appendChild(mark); cell.appendChild(del);
  });
}

/* ---------------- Overlay ---------------- */
function openClass(classIndex){
  const g = groups[currentGroupIndex];
  const cls = g.classes[classIndex];
  if(!cls.name) cls.name=cls.date;
  let html=`<h3>Register Class: ${cls.date}</h3>
    <label>Class name: <input type="text" id="className" value="${cls.name}"></label>
    <table border="1"><tr><th>Student</th><th>Attendance</th><th>Homework</th></tr>`;
  cls.records.forEach((r,i)=>{
    html+=`
      <tr>
        <td>${r.name}</td>
        <td><input type="checkbox" id="att_${i}" ${r.attendance?"checked":""}></td>
        <td><input type="checkbox" id="hw_${i}" ${r.homework?"checked":""}></td>
      </tr>`;
  });
  html+=`</table>
    <button id="saveBtn">Save</button>
    <button id="cancelBtn">Close</button>`;

  const div=document.createElement("div");
  div.innerHTML=html;
  div.className="overlay-content";
  const overlay=document.createElement("div");
  overlay.className="overlay";
  overlay.appendChild(div);
  document.body.appendChild(overlay);

  div.querySelector("#saveBtn").addEventListener("click", ()=>saveClass(classIndex));
  div.querySelector("#cancelBtn").addEventListener("click", cancelOverlay);
}

async function saveClass(classIndex){
  const g = groups[currentGroupIndex];
  const cls = g.classes[classIndex];
  cls.name=document.getElementById("className").value.trim()||cls.date;
  cls.records.forEach((r,i)=>{
    r.attendance=document.getElementById("att_"+i).checked;
    r.homework=document.getElementById("hw_"+i).checked;
  });
  cls.completed=true;
  await updateDoc(doc(db,"groups",g.name),{classes:g.classes});
  cancelOverlay();
  renderClasses();
  checkFlags();
}

function cancelOverlay(){
  document.querySelectorAll(".overlay").forEach(o=>o.remove());
}

/* ---------------- Flags ---------------- */
function checkFlags(){
  const g = groups[currentGroupIndex];
  if(!g) return;
  let flagged=[];
  g.students.forEach(s=>{
    let abs=0, miss=0;
    g.classes.forEach(c=>{
      const rec=c.records.find(r=>r.name===s.name);
      if(rec){
        if(!rec.attendance) abs++;
        if(!rec.homework) miss++;
      }
    });
    if(abs>=3||miss>=3){
      flagged.push(`${s.name} (Absences: ${abs}, Missing HW: ${miss})`);
    }
  });
  if(flagged.length>0){
    document.getElementById("notificationSection").style.display="block";
    document.getElementById("flaggedMessage").value="Flagged students:\n"+flagged.join("\n");
  } else {
    document.getElementById("notificationSection").style.display="none";
  }
}

/* ---------------- WhatsApp ---------------- */
document.getElementById("sendWhatsAppBtn").addEventListener("click", ()=>{
  const msg=encodeURIComponent(document.getElementById("flaggedMessage").value);
  window.open(`https://wa.me/?text=${msg}`, "_blank");
});

/* ---------------- Eventos ---------------- */
document.getElementById("addGroupBtn").addEventListener("click",createGroup);
document.getElementById("addStudentBtn").addEventListener("click",addStudent);
document.getElementById("generateClassesBtn").addEventListener("click",generateClasses);
document.getElementById("deleteGroupBtn").addEventListener("click",deleteGroup);

/* ---------------- Abrir página de Grades ---------------- */
function openGradesPage(group){
  localStorage.setItem("currentGroup", group.name);
  const groupsData = JSON.parse(localStorage.getItem("groupsData") || "{}");
  groupsData[group.name] = { students: group.students.map(s=>s.name), level: group.level };
  localStorage.setItem("groupsData", JSON.stringify(groupsData));
  window.location.href = "grades.html";
}
document.getElementById("openGradesBtn").addEventListener("click", () => {
    const selectedGroup = document.getElementById("groupSelect").value;
  if(!selectedGroup) return alert("Selecione uma turma");
  localStorage.setItem("currentGroup", selectedGroup);
  window.location.href = "grades.html";
});
