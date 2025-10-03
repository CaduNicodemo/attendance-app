// Firebase Auth
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase Firestore
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Importa auth e db do config.js (já inicializados)
import { auth, db } from "./config.js";


/* ---------------- Estado de autenticação ---------------- */
onAuthStateChanged(auth, (user) => {
  // Alguns elementos podem não existir se o HTML mudar; guardamos com checks
  const loginSection = document.getElementById("loginSection");
  const mainApp = document.getElementById("mainApp");
  const topbar = document.getElementById("topbar");
  const userInfo = document.getElementById("userInfo");

  if (user) {
    if (loginSection) loginSection.style.display = "none";
    if (mainApp) mainApp.style.display = "block";
    if (topbar) topbar.style.display = "flex";
    if (userInfo) userInfo.innerText = `Logado como: ${user.email}`;
    loadGroups();
  } else {
    if (loginSection) loginSection.style.display = "flex";
    if (mainApp) mainApp.style.display = "none";
    if (topbar) topbar.style.display = "none";
  }
});

/* ---------------- Login / Logout ---------------- */
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const emailEl = document.getElementById("loginEmail");
    const passEl = document.getElementById("loginPassword");
    const msgEl = document.getElementById("loginMsg");
    const email = emailEl ? emailEl.value.trim() : "";
    const pass = passEl ? passEl.value.trim() : "";
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      if (msgEl) msgEl.innerText = "Erro: " + err.message;
      console.error("login error", err);
    }
  });
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth).catch((err) => console.error("Erro ao sair:", err));
  });
}

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
  try {
    const snap = await getDocs(collection(db,"groups"));
    groups = [];
    snap.forEach(docSnap=>{
      groups.push({ id: docSnap.id, ...docSnap.data()});
    });
    groups.sort((a,b)=> (a.order || 0) - (b.order || 0) );
    renderGroupButtons();
    if(groups.length>0) selectGroup(0);
  } catch (err) {
    console.error("Erro ao carregar grupos:", err);
  }
}

/* ---------------- Criar Grupo ---------------- */
async function createGroup(){
  const selectEl = document.getElementById("groupType");
  const typeName = selectEl ? selectEl.value : "Kids1"; // ex: "Kids1", "Teens3"
  // data-level attribute should contain base level (Kids, Juniors, TeensA1_2 etc.)
  const level = (selectEl && selectEl.options[selectEl.selectedIndex] && selectEl.options[selectEl.selectedIndex].dataset.level)
                ? selectEl.options[selectEl.selectedIndex].dataset.level
                : (typeName.startsWith("Kids") ? "Kids" : (typeName.startsWith("Teens") ? "Teens" : "Juniors"));

  const nameInput = document.getElementById("groupName");
  const name = nameInput ? nameInput.value.trim() : "";
  if(!name) return alert("Name your group");

  const fullName = `${typeName} ${name}`; // e.g. "Teens3 Morning" or "Kids1 Morning"
  const newGroup = { name: fullName, type: typeName, level: level, students:[], classes:[], days:[], order: groups.length };

  try {
    await setDoc(doc(db,"groups", fullName), newGroup);
    groups.push({ id: fullName, ...newGroup});
    if (nameInput) nameInput.value = "";
    renderGroupButtons();
    selectGroup(groups.length-1);
  } catch (err) {
    console.error("Erro ao criar grupo:", err);
    alert("Erro ao criar grupo: " + err.message);
  }
}

/* ---------------- Render Group Buttons ---------------- */
function renderGroupButtons(){
  const container = document.getElementById("groupsButtons");
  if(!container) return;
  container.innerHTML="";
  groups.sort((a,b)=> (a.order||0) - (b.order||0) ).forEach((g,i)=>{
    const btn = document.createElement("div");
    btn.className="group-button";
    btn.draggable = true;
    btn.dataset.index = i;
    btn.style.backgroundColor = `hsl(200,60%,${40+40*(i/Math.max(groups.length-1,1))}%)`;
    btn.innerText = g.name;
    btn.addEventListener("click", ()=>selectGroup(i));

    // Duplo clique: abre página de notas (grades)
    btn.addEventListener("dblclick", () => {
      openGradesPage(g);
    });

    // Drag & Drop - rearrange order
    btn.addEventListener("dragstart", e=>{
      e.dataTransfer.setData("index", i);
    });
    btn.addEventListener("dragover", e=>e.preventDefault());
    btn.addEventListener("drop", async e=>{
      const from = +e.dataTransfer.getData("index");
      const to = i;
      if (Number.isNaN(from)) return;
      const moved = groups.splice(from,1)[0];
      groups.splice(to,0,moved);
      groups.forEach((gg, idx) => gg.order = idx);
      // persist orders
      for(const gg of groups){
        try {
          await updateDoc(doc(db,"groups",gg.name), { order: gg.order });
        } catch(err){
          console.warn("Não foi possível atualizar ordem no Firestore (pode ser inexistente):", err);
        }
      }
      renderGroupButtons();
    });

    container.appendChild(btn);
  });
}

/* ---------------- Select Group ---------------- */
function selectGroup(i){
  if (typeof i !== "number" || !groups[i]) return;
  currentGroupIndex = i;
  // Atualiza UI com dados do grupo
  cleanupOldClasses(groups[i]).finally(()=>{
    renderStudents();
    renderClasses();
    checkFlags();
  });
}

/* ---------------- Delete Group ---------------- */
async function deleteGroup(){
  if(!groups[currentGroupIndex]) return;
  const g = groups[currentGroupIndex];
  if(confirm(`Delete group "${g.name}"?`)){
    try {
      await deleteDoc(doc(db,"groups",g.id));
    } catch (err) {
      console.warn("deleteDoc via id falhou, tentando por name...", err);
      // tentar por name
      try { await deleteDoc(doc(db,"groups",g.name)); } catch(e){ console.error(e); }
    }
    groups.splice(currentGroupIndex,1);
    currentGroupIndex = Math.max(0, currentGroupIndex-1);
    renderGroupButtons();
    if(groups.length>0) selectGroup(0);
    else {
      const studentsTable = document.getElementById("studentsTable");
      const classesTable = document.getElementById("classesTable");
      if(studentsTable) studentsTable.innerHTML = "<tr><th>Students</th><th>Remove Student</th></tr>";
      if(classesTable) classesTable.innerHTML = "<tr><th>Date</th><th>Name</th><th>Register</th></tr>";
      const notif = document.getElementById("notificationSection"); if(notif) notif.style.display="none";
    }
  }
}

/* ---------------- Cleanup old classes ---------------- */
async function cleanupOldClasses(g){
  if(!g || !g.classes) return;
  const hoje = todayISO();
  const limite = -10; // remove aulas com diferença de dias < -10
  const novas = g.classes.filter(c => daysDiff(c.date,hoje) >= limite);
  if(novas.length !== g.classes.length){
    g.classes = novas;
    try {
      await updateDoc(doc(db,"groups",g.name), { classes: g.classes });
    } catch(err){
      console.error("Erro ao atualizar classes após cleanup:", err);
    }
  }
}

/* ---------------- Alunos ---------------- */
async function addStudent(){
  const nameEl = document.getElementById("studentName");
  const name = nameEl ? nameEl.value.trim() : "";
  if(!name) return alert("Insert student's name");
  const g = groups[currentGroupIndex];
  if(!g) return alert("Select a group first");
  g.students = g.students || [];
  g.students.push({ name });
  // atualiza classes records para aulas futuras
  const hoje = todayISO();
  g.classes = g.classes || [];
  g.classes.forEach(c=>{
    c.records = c.records || [];
    if(c.date >= hoje && !c.records.find(r=>r.name===name)){
      c.records.push({ name, attendance:false, homework:false });
    }
  });
  try {
    await updateDoc(doc(db,"groups",g.name), { students: g.students, classes: g.classes });
  } catch(err){
    console.error("Erro ao adicionar aluno:", err);
  }
  if (nameEl) nameEl.value = "";
  renderStudents();
  renderClasses();
}

async function removeStudent(index){
  const g = groups[currentGroupIndex];
  if(!g || !g.students || !g.students[index]) return;
  const removed = g.students.splice(index,1)[0];
  g.classes = g.classes || [];
  g.classes.forEach(c=>{
    c.records = (c.records || []).filter(r=>r.name !== removed.name);
  });
  try {
    await updateDoc(doc(db,"groups",g.name), { students: g.students, classes: g.classes });
  } catch(err){
    console.error("Erro ao remover aluno:", err);
  }
  renderStudents();
  renderClasses();
}

/* ---------------- Render Alunos ---------------- */
function renderStudents(){
  const g = groups[currentGroupIndex];
  const t = document.getElementById("studentsTable");
  if(!t) return;
  t.innerHTML = `<tr><th colspan="2">${g ? g.name : ""}</th></tr><tr><th>Name</th><th>Remove</th></tr>`;
  if(!g || !g.students) return;
  g.students.forEach((s,i)=>{
    const row = t.insertRow();
    row.insertCell(0).innerText = s.name;
    const btnCell = row.insertCell(1);
    const btn = document.createElement("button");
    btn.innerText = "Remover";
    btn.addEventListener("click", ()=> removeStudent(i));
    btnCell.appendChild(btn);
  });
}

/* ---------------- Gerar Aulas ---------------- */
async function generateClasses(){
  const g = groups[currentGroupIndex];
  if(!g) return alert("Select a group");
  g.days = [];
  const mon = document.getElementById("mon");
  const tue = document.getElementById("tue");
  const wed = document.getElementById("wed");
  const thu = document.getElementById("thu");
  const fri = document.getElementById("fri");
  if(mon && mon.checked) g.days.push(1);
  if(tue && tue.checked) g.days.push(2);
  if(wed && wed.checked) g.days.push(3);
  if(thu && thu.checked) g.days.push(4);
  if(fri && fri.checked) g.days.push(5);
  if(g.days.length===0) return alert("Select class days");

  let d = new Date();
  const end = new Date(new Date().getFullYear(),11,31);
  g.classes = g.classes || [];
  while(d <= end) {
    const day = d.getDay();
    const dateStr = d.toISOString().slice(0,10);
    if(g.days.includes(day) && !isHoliday(dateStr)) {
      if(!g.classes.find(c=>c.date===dateStr)){
        g.classes.push({
          date: dateStr,
          name: dateStr,
          completed: false,
          records: (g.students || []).map(s => ({ name: s.name, attendance:false, homework:false }))
        });
      }
    }
    d.setDate(d.getDate()+1);
  }
  g.classes.sort((a,b)=>a.date.localeCompare(b.date));
  try {
    await updateDoc(doc(db,"groups",g.name), { days: g.days, classes: g.classes });
  } catch(err){
    console.error("Erro ao salvar classes:", err);
  }
  renderClasses();
}

/* ---------------- Format date BR ---------------- */
function formatDateBR(dateStr) {
  if(!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

/* ---------------- Render Classes ---------------- */
function renderClasses(){
  const g = groups[currentGroupIndex];
  const t = document.getElementById("classesTable");
  if(!t) return;
  t.innerHTML = `<tr><th>Date</th><th>Name</th><th>Register</th></tr>`;
  if(!g || !g.classes) return;
  const hoje = todayISO();
  g.classes.forEach((c,i)=>{
    const row = t.insertRow();
    if(c.date === hoje) row.classList.add("today-class");
    row.insertCell(0).innerText = formatDateBR(c.date);
    const nameCell = row.insertCell(1);
    const inp = document.createElement("input");
    inp.type = "text";
    inp.value = c.name || c.date;
    inp.addEventListener("change", async e=>{
      c.name = e.target.value.trim() || c.date;
      try { await updateDoc(doc(db,"groups",g.name), { classes: g.classes }); }
      catch(err){ console.error("Erro update class name:", err); }
    });
    nameCell.appendChild(inp);

    const cell = row.insertCell(2);
    const mark = document.createElement("button");
    mark.innerText = "Register";
    mark.addEventListener("click", ()=> openClass(i));
    const del = document.createElement("button");
    del.innerText = "Delete";
    del.addEventListener("click", async ()=> {
      g.classes.splice(i,1);
      try { await updateDoc(doc(db,"groups",g.name), { classes: g.classes }); }
      catch(err){ console.error("Erro delete class:", err); }
      renderClasses();
    });
    cell.appendChild(mark);
    cell.appendChild(del);
  });
}

/* ---------------- Overlay (abrir aula) ---------------- */
function openClass(classIndex){
  const g = groups[currentGroupIndex];
  if(!g || !g.classes || !g.classes[classIndex]) return;
  const cls = g.classes[classIndex];
  if(!cls.name) cls.name = cls.date;

  let html = `<h3>Register Class: ${cls.date}</h3>
    <label>Class name: <input type="text" id="className" value="${cls.name}"></label>
    <table border="1"><tr><th>Student</th><th>Attendance</th><th>Homework</th></tr>`;

  cls.records = cls.records || [];
  cls.records.forEach((r,i) => {
    html += `<tr>
      <td>${r.name}</td>
      <td><input type="checkbox" id="att_${i}" ${r.attendance ? "checked" : ""}></td>
      <td><input type="checkbox" id="hw_${i}" ${r.homework ? "checked" : ""}></td>
    </tr>`;
  });

  html += `</table>
    <button id="saveBtn">Save</button>
    <button id="cancelBtn">Close</button>`;

  const div = document.createElement("div");
  div.innerHTML = html;
  div.className = "overlay-content";
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.appendChild(div);
  document.body.appendChild(overlay);

  const saveBtn = div.querySelector("#saveBtn");
  const cancelBtn = div.querySelector("#cancelBtn");
  if (saveBtn) saveBtn.addEventListener("click", ()=> saveClass(classIndex));
  if (cancelBtn) cancelBtn.addEventListener("click", cancelOverlay);
}

/* ---------------- Save overlay class ---------------- */
async function saveClass(classIndex){
  const g = groups[currentGroupIndex];
  if(!g || !g.classes || !g.classes[classIndex]) return;
  const cls = g.classes[classIndex];
  const nameEl = document.getElementById("className");
  cls.name = nameEl ? nameEl.value.trim() || cls.date : cls.name;
  cls.records = cls.records || [];
  cls.records.forEach((r,i) => {
    const attEl = document.getElementById(`att_${i}`);
    const hwEl = document.getElementById(`hw_${i}`);
    r.attendance = attEl ? !!attEl.checked : !!r.attendance;
    r.homework = hwEl ? !!hwEl.checked : !!r.homework;
  });
  cls.completed = true;
  try {
    await updateDoc(doc(db,"groups",g.name), { classes: g.classes });
  } catch(err) {
    console.error("Erro ao salvar aula:", err);
  }
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
  let flagged = [];
  (g.students || []).forEach(s=>{
    let abs = 0, miss = 0;
    (g.classes || []).forEach(c=>{
      const rec = (c.records || []).find(r=>r.name === s.name);
      if(rec){
        if(!rec.attendance) abs++;
        if(!rec.homework) miss++;
      }
    });
    if(abs >= 3 || miss >= 3) flagged.push(`${s.name} (Absences: ${abs}, Missing HW: ${miss})`);
  });
  const notifSection = document.getElementById("notificationSection");
  const flaggedMessage = document.getElementById("flaggedMessage");
  if(flagged.length > 0){
    if(notifSection) notifSection.style.display = "block";
    if(flaggedMessage) flaggedMessage.value = "Flagged students:\n" + flagged.join("\n");
  } else {
    if(notifSection) notifSection.style.display = "none";
  }
}

/* ---------------- WhatsApp ---------------- */
const sendWhatsBtn = document.getElementById("sendWhatsAppBtn");
if (sendWhatsBtn) {
  sendWhatsBtn.addEventListener("click", ()=>{
    const msgEl = document.getElementById("flaggedMessage");
    const phone = "+5511991463208"; // mantive seu número de exemplo
    const text = msgEl ? encodeURIComponent(msgEl.value) : "";
    const url = `https://wa.me/${phone}?text=${text}`;
    window.open(url, "_blank");
  });
}

/* ---------------- Open Grades Page ---------------- */
function openGradesPage(group){
  if(!group || !group.name) return;
  // gravamos o nome do grupo (id é o mesmo nome que usamos como doc id)
  localStorage.setItem("currentGroup", group.name);
  // redireciona para grades.html que vai buscar o doc pelo nome
  window.location.href = "grades.html";
}

/* ---------------- Open Grades (button) ---------------- */
const openGradesBtn = document.getElementById("openGradesBtn");
if (openGradesBtn) {
  openGradesBtn.addEventListener("click", () => {
    // abre a turma atualmente selecionada na lista (não o select de tipos)
    const g = groups[currentGroupIndex];
    if (g && g.name) {
      openGradesPage(g);
    } else {
      alert("Selecione um grupo primeiro!");
    }
  });
}

/* ---------------- Eventos (associações finais) ---------------- */
const addGroupBtn = document.getElementById("addGroupBtn");
if (addGroupBtn) addGroupBtn.addEventListener("click", createGroup);
const addStudentBtn = document.getElementById("addStudentBtn");
if (addStudentBtn) addStudentBtn.addEventListener("click", addStudent);
const generateClassesBtn = document.getElementById("generateClassesBtn");
if (generateClassesBtn) generateClassesBtn.addEventListener("click", generateClasses);
const deleteGroupBtn = document.getElementById("deleteGroupBtn");
if (deleteGroupBtn) deleteGroupBtn.addEventListener("click", deleteGroup);

/* ---------------- Inicial (caso necessário) ---------------- */
// loadGroups() é chamado dentro do onAuthStateChanged quando user existe.
