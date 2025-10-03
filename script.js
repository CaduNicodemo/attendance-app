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
  const levelSelect = document.getElementById("groupType");
  const level = levelSelect ? levelSelect.value : "Kids";
  const name = document.getElementById("groupName").value.trim();
  if(!name) return alert("Name your group");

  const fullName = `${level} ${name}`;
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
  await updateDoc(doc(db,"groups",g.name),{students:g.students});
  document.getElementById("studentName").value="";
  renderStudents();
}

async function removeStudent(index){
  const g = groups[currentGroupIndex];
  const removed = g.students.splice(index,1)[0];
  await updateDoc(doc(db,"groups",g.name),{students:g.students});
  renderStudents();
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

/* ---------------- Abrir página de Grades ---------------- */
function openGradesPage(group){
  localStorage.setItem("currentGroup", group.name);
  window.location.href = "grades.html";
}

document.getElementById("openGradesBtn").addEventListener("click", () => {
  const selectedGroup = document.getElementById("groupType").value; // CORRIGIDO
  if(!selectedGroup) return alert("Selecione uma turma");
  localStorage.setItem("currentGroup", selectedGroup);
  window.location.href = "grades.html";
});

/* ---------------- Eventos ---------------- */
document.getElementById("addGroupBtn").addEventListener("click",createGroup);
document.getElementById("addStudentBtn").addEventListener("click",addStudent);
document.getElementById("deleteGroupBtn").addEventListener("click",deleteGroup);
