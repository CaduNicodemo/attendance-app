// =======================================================
// 🔹 IMPORTS
// =======================================================
import { db, auth } from "./config.js";
import {
  collection, addDoc, getDocs, doc, deleteDoc,
  query, where, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let currentUser = null;
let selectedGroupId = null;
let selectedGroupColor = null;

// =======================================================
// 🔹 LOGIN STATUS
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
  if (!auth) {
    console.error("Firebase Auth não inicializado corretamente.");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("mainApp").style.display = "block";
    document.getElementById("userInfo").textContent = user.email;
    loadGroups();
  } else {
    window.location.href = "index.html";
  }
});

// =======================================================
// 🔹 LOGOUT
// =======================================================
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// =======================================================
// 🔹 ADICIONAR GRUPO
// =======================================================
document.getElementById("addGroupBtn").addEventListener("click", async () => {
  const groupName = document.getElementById("groupName").value.trim();
  const groupTypeSelect = document.getElementById("groupType");
  const groupType = groupTypeSelect.value;
  const groupLevel = groupTypeSelect.selectedOptions[0].dataset.level;
  const color = document.getElementById("groupColor").value;

  if (!groupName) {
    alert("Please enter a group name.");
    return;
  }

  try {
    await addDoc(collection(db, "groups"), {
      userId: currentUser.uid,
      name: groupName,
      type: groupType,
      level: groupLevel,
      color: color,
      createdAt: new Date(),
      lessonDays: [] // Aqui você poderá adicionar dias da semana do grupo
    });

    document.getElementById("groupName").value = "";
    loadGroups();
  } catch (err) {
    console.error("Erro ao adicionar grupo:", err);
  }
});

// =======================================================
// 🔹 CARREGAR GRUPOS
// =======================================================
async function loadGroups() {
  if (!currentUser) return;

  const groupsRef = collection(db, "groups");
  const q = query(groupsRef, where("userId", "==", currentUser.uid));
  const querySnapshot = await getDocs(q);

  const container = document.getElementById("groupsButtons");
  container.innerHTML = "";

  querySnapshot.forEach(docSnap => {
    const group = docSnap.data();
    const groupDiv = document.createElement("div");
    groupDiv.classList.add("group-item");

    const groupBtn = document.createElement("button");
    groupBtn.textContent = group.name;
    groupBtn.classList.add("group-name");
    groupBtn.style.background = group.color || "var(--azul-grupo)";
    groupBtn.addEventListener("click", () => {
      selectGroup(docSnap.id, group.color);
    });

    groupDiv.appendChild(groupBtn);
    container.appendChild(groupDiv);
  });
}

// =======================================================
// 🔹 SELECIONAR GRUPO
// =======================================================
async function selectGroup(groupId, color) {
  selectedGroupId = groupId;
  selectedGroupColor = color;
  document.body.style.background = color;
  document.getElementById("groupDetails").style.display = "block";
  await loadStudents();
  await showLessons();
}

// =======================================================
// 🔹 DELETAR GRUPO
// =======================================================
document.getElementById("deleteGroupBtn").addEventListener("click", async () => {
  if (!selectedGroupId) return;
  if (!confirm("Tem certeza que deseja deletar este grupo?")) return;

  try {
    await deleteDoc(doc(db, "groups", selectedGroupId));
    alert("Grupo deletado com sucesso!");
    document.getElementById("groupDetails").style.display = "none";
    loadGroups();
  } catch (err) {
    console.error("Erro ao deletar grupo:", err);
  }
});

// =======================================================
// 🔹 CARREGAR ALUNOS
// =======================================================
async function loadStudents() {
  const studentsTable = document.getElementById("studentsTable");
  studentsTable.innerHTML = `
    <tr><th>Name</th><th>Delete</th></tr>
  `;

  const studentsRef = collection(db, "groups", selectedGroupId, "students");
  const snapshot = await getDocs(studentsRef);

  snapshot.forEach((docSnap) => {
    const student = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${student.name}</td>
      <td><button class="deleteStudentBtn" data-id="${docSnap.id}">X</button></td>
    `;
    studentsTable.appendChild(tr);
  });

  // Deletar aluno
  document.querySelectorAll(".deleteStudentBtn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const studentId = e.target.dataset.id;
      await deleteDoc(doc(db, "groups", selectedGroupId, "students", studentId));
      loadStudents();
    });
  });
}

// =======================================================
// 🔹 ADICIONAR ALUNO
// =======================================================
document.getElementById("addStudentBtn").addEventListener("click", async () => {
  const name = document.getElementById("studentName").value.trim();
  if (!name || !selectedGroupId) return;

  await addDoc(collection(db, "groups", selectedGroupId, "students"), { name });
  document.getElementById("studentName").value = "";
  loadStudents();
});

// =======================================================
// 🔹 MOSTRAR AULAS (duas passadas + duas próximas, respeitando dias do grupo)
// =======================================================
async function showLessons() {
  const container = document.getElementById("lessonsList");
  container.innerHTML = "";

  if (!selectedGroupId) return;

  // Busca o grupo atual para saber os dias da semana
  const groupRef = doc(db, "users", currentUser.uid, "groups", selectedGroupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) return;

  const groupData = groupSnap.data();
  const diasSelecionados = groupData.days || ["monday", "wednesday"]; // fallback

  const aulas = gerarAulasPorDias(diasSelecionados);

  // Cria blocos de aula
  for (const data of aulas) {
    const dataFormatada = data.toLocaleDateString("pt-BR");
    const aulaDiv = document.createElement("div");
    aulaDiv.classList.add("lesson-item");
    aulaDiv.style.background = "var(--cinza-claro-rb)";
    aulaDiv.textContent = dataFormatada;

    aulaDiv.addEventListener("click", () => openLessonModal(dataFormatada));
    container.appendChild(aulaDiv);
  }
}

/**
 * Gera 2 aulas passadas e 2 futuras com base nos dias selecionados
 */
function gerarAulasPorDias(diasSelecionados) {
  const hoje = new Date();
  const diasSemana = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };

  const diasSelecionadosNum = diasSelecionados.map(d => diasSemana[d.toLowerCase()]);
  let todasDatas = [];

  diasSelecionadosNum.forEach(diaNum => {
    // últimas 2 aulas
    let dataAnterior = new Date(hoje);
    let encontradasAnt = 0;
    while (encontradasAnt < 2) {
      dataAnterior.setDate(dataAnterior.getDate() - 1);
      if (dataAnterior.getDay() === diaNum) {
        todasDatas.unshift(new Date(dataAnterior));
        encontradasAnt++;
      }
    }

    // próximas 2 aulas
    let dataProxima = new Date(hoje);
    let encontradasProx = 0;
    while (encontradasProx < 2) {
      dataProxima.setDate(dataProxima.getDate() + 1);
      if (dataProxima.getDay() === diaNum) {
        todasDatas.push(new Date(dataProxima));
        encontradasProx++;
      }
    }
  });

  // Remove duplicadas e ordena
  todasDatas = todasDatas.filter((d, i, arr) => i === 0 || d.toDateString() !== arr[i - 1].toDateString());
  todasDatas.sort((a, b) => a - b);

  return todasDatas;
}

// =======================================================
// 🔹 MODAL DE AULA (presença e homework)
// =======================================================
async function openLessonModal(dataFormatada) {
  const studentsRef = collection(db, "users", currentUser.uid, "groups", selectedGroupId, "students");
  const snapshot = await getDocs(studentsRef);

  // Cria modal dinamicamente
  let modal = document.getElementById("lessonModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "lessonModal";
    modal.classList.add("modal");
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Aula ${dataFormatada}</h3>
        <table id="modalTable">
          <tr><th>Aluno</th><th>Presença</th><th>Homework</th></tr>
        </table>
        <button id="saveLessonBtn">Salvar</button>
        <button id="closeLessonBtn">Fechar</button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const modalTable = modal.querySelector("#modalTable");
  modalTable.innerHTML = `<tr><th>Aluno</th><th>Presença</th><th>Homework</th></tr>`;

  snapshot.forEach(docSnap => {
    const student = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${student.name}</td>
      <td><input type="checkbox" class="attCheckbox"></td>
      <td><input type="checkbox" class="hwCheckbox"></td>
    `;
    modalTable.appendChild(tr);
  });

  modal.style.display = "block";

  modal.querySelector("#closeLessonBtn").onclick = () => (modal.style.display = "none");

  modal.querySelector("#saveLessonBtn").onclick = async () => {
    const linhas = modalTable.querySelectorAll("tr:not(:first-child)");
    for (const linha of linhas) {
      const nome = linha.children[0].textContent;
      const presenca = linha.children[1].querySelector("input").checked;
      const homework = linha.children[2].querySelector("input").checked;

      await addDoc(collection(db, "users", currentUser.uid, "groups", selectedGroupId, "lessons"), {
        date: dataFormatada,
        student: nome,
        attendance: presenca,
        homework: homework
      });
    }

    alert("Registros salvos com sucesso!");
    modal.style.display = "none";

    // Atualiza cores de aula (cinza escuro = preenchido)
    const lessonsDivs = document.querySelectorAll(".lesson-item");
    lessonsDivs.forEach(div => {
      if (div.textContent === dataFormatada) {
        div.style.background = "var(--cinza-rb)";
      }
    });
  };
}
