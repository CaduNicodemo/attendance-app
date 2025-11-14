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
// 🔹 CONTROLE DO MODAL DE NOVO GRUPO
// =======================================================

// Abrir modal
document.getElementById("openGroupModalBtn").addEventListener("click", () => {
  document.getElementById("groupModal").style.display = "flex";
});

// Fechar modal
document.getElementById("closeGroupModalBtn").addEventListener("click", () => {
  document.getElementById("groupModal").style.display = "none";
  // Limpar formulário ao fechar
  document.getElementById("groupName").value = "";
  document.querySelectorAll('#groupDays input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false;
  });
});

// Fechar modal ao clicar fora dele
document.getElementById("groupModal").addEventListener("click", (e) => {
  if (e.target.id === "groupModal") {
    document.getElementById("groupModal").style.display = "none";
  }
});
// =======================================================
// 🔹 ADICIONAR GRUPO (ATUALIZADA)
// =======================================================
document.getElementById("addGroupBtn").addEventListener("click", async () => {
  const groupName = document.getElementById("groupName").value.trim();
  const groupTypeSelect = document.getElementById("groupType");
  const groupType = groupTypeSelect.value;
  const groupLevel = groupTypeSelect.selectedOptions[0].dataset.level;
  const color = document.getElementById("groupColor").value;
  
  const lessonDays = [];
  document.querySelectorAll('#groupDays input[type="checkbox"]:checked').forEach(checkbox => {
    lessonDays.push(parseInt(checkbox.value));
  });
  
  if (!groupName) {
    alert("Please enter a group name.");
    return;
  }
  
  if (lessonDays.length === 0) {
    alert("Please select at least one day for lessons.");
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
      lessonDays: lessonDays
    });

    // Fechar modal e limpar
    document.getElementById("groupModal").style.display = "none";
    document.getElementById("groupName").value = "";
    document.querySelectorAll('#groupDays input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = false;
    });
    
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
// 🔹 FORMATAR DATA (função auxiliar)
// =======================================================
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// =======================================================
// 🔹 GERAR AULAS BASEADO NOS DIAS DA SEMANA (PASSADAS + FUTURAS)
// =======================================================
function generateLessonsBasedOnDays(startDate, lessonDays, lessonsBefore, lessonsAfter) {
  const lessons = [];
  let currentDate = new Date(startDate);
  
  // 🔹 AULAS PASSADAS (começar antes da data atual)
  let pastLessonsGenerated = 0;
  let searchDate = new Date(currentDate);
  searchDate.setDate(searchDate.getDate() - 1); // Começar de ontem

  // Buscar aulas passadas
  while (pastLessonsGenerated < lessonsBefore) {
    const dayOfWeek = searchDate.getDay();
    
    if (lessonDays.includes(dayOfWeek)) {
      const dateFormatted = formatDate(searchDate);
      lessons.push({
        date: dateFormatted,
        isoDate: searchDate.toISOString().split("T")[0],
        isPast: true
      });
      pastLessonsGenerated++;
    }
    
    searchDate.setDate(searchDate.getDate() - 1); // Voltar no tempo
  }

  // 🔹 AULAS FUTURAS (começar da data atual)
  let futureLessonsGenerated = 0;
  searchDate = new Date(currentDate); // Reset para hoje

  // Buscar aulas futuras
  while (futureLessonsGenerated < lessonsAfter) {
    const dayOfWeek = searchDate.getDay();
    
    if (lessonDays.includes(dayOfWeek)) {
      // Pular hoje se for um dia de aula (ou incluir, conforme sua preferência)
      if (searchDate.getDate() !== currentDate.getDate() || searchDate.getMonth() !== currentDate.getMonth()) {
        const dateFormatted = formatDate(searchDate);
        lessons.push({
          date: dateFormatted,
          isoDate: searchDate.toISOString().split("T")[0],
          isPast: false
        });
        futureLessonsGenerated++;
      }
    }
    
    searchDate.setDate(searchDate.getDate() + 1); // Avançar no tempo
  }

  // Ordenar todas as aulas por data
  lessons.sort((a, b) => new Date(a.isoDate) - new Date(b.isoDate));
  
  return lessons;
}

// =======================================================
// 🔹 MOSTRAR AULAS (baseado nos dias do grupo)
// =======================================================
async function showLessons() {
  const container = document.getElementById("lessonsList");
  container.innerHTML = "";

  if (!selectedGroupId) return;

  try {
    // 1. Buscar os dados do grupo para pegar os lessonDays
    const groupDocRef = doc(db, "groups", selectedGroupId);
    const groupSnapshot = await getDoc(groupDocRef);
    
    if (!groupSnapshot.exists()) {
      console.error("Grupo não encontrado");
      return;
    }

    const group = groupSnapshot.data();
    const lessonDays = group.lessonDays || []; // [0, 2, 4] = Domingo, Terça, Quinta

    if (lessonDays.length === 0) {
      container.innerHTML = "<p>No lesson days configured for this group</p>";
      return;
    }

    // 2. Gerar aulas baseadas nos dias específicos (2 passadas + 2 futuras)
    const today = new Date();
    const lessons = generateLessonsBasedOnDays(today, lessonDays, 2, 2);

    // 3. Mostrar aulas
    for (const lesson of lessons) {
      const lessonDiv = document.createElement("div");
      lessonDiv.classList.add("lesson-item");
      lessonDiv.textContent = lesson.date;

      // Verificar se presença/homework preenchido
      const lessonDocRef = doc(db, "groups", selectedGroupId, "lessons", lesson.isoDate);
      const lessonSnapshot = await getDoc(lessonDocRef);
      
      if (lessonSnapshot.exists()) {
        lessonDiv.style.background = "var(--cinza-rb)";
      } else {
        lessonDiv.style.background = "var(--cinza-claro-rb)";
      }

      lessonDiv.addEventListener("click", () => openLessonModal(lesson.isoDate));
      container.appendChild(lessonDiv);
    }

  } catch (err) {
    console.error("Erro ao carregar aulas:", err);
  }
}

// =======================================================
// 🔹 ABRIR MODAL DE AULA (VERSÃO COMPLETAMENTE CORRIGIDA)
// =======================================================
async function openLessonModal(lessonDate) {
  if (!selectedGroupId || !selectedGroupColor) {
    alert("Selecione um grupo primeiro.");
    return;
  }
  if (!currentUser) {
    alert("Usuário não autenticado.");
    return;
  }

  const modal = document.getElementById("lessonModal");
  const modalTable = document.getElementById("lessonModalTable");

  if (!modalTable) {
    console.error("Elemento modalTable não encontrado no DOM.");
    return;
  }

  // Limpar tabela, mantendo apenas o cabeçalho
  while (modalTable.rows.length > 1) {
    modalTable.deleteRow(1);
  }

  // Aplicar a cor do grupo ao cabeçalho da tabela
  const tableHeaders = modalTable.querySelectorAll('th');
  tableHeaders.forEach(header => {
    header.style.backgroundColor = selectedGroupColor;
    header.style.color = 'white';
  });

  const studentsRef = collection(db, "groups", selectedGroupId, "students");
  const studentsSnapshot = await getDocs(studentsRef);

  const lessonDocRef = doc(db, "groups", selectedGroupId, "lessons", lessonDate);
  const lessonSnapshot = await getDoc(lessonDocRef);
  const lessonData = lessonSnapshot.exists() ? lessonSnapshot.data() : {};

  // Adicionar alunos à tabela
  studentsSnapshot.forEach(studentDoc => {
    const student = studentDoc.data();
    const studentId = studentDoc.id;

    const row = modalTable.insertRow();
    const cell1 = row.insertCell(0);
    const cell2 = row.insertCell(1);
    const cell3 = row.insertCell(2);

    cell1.textContent = student.name;
    
    const attCheckbox = document.createElement("input");
    attCheckbox.type = "checkbox";
    attCheckbox.className = "attCheckbox";
    attCheckbox.dataset.studentId = studentId;
    attCheckbox.checked = lessonData[studentId]?.attendance || false;
    cell2.appendChild(attCheckbox);
    
    const hwCheckbox = document.createElement("input");
    hwCheckbox.type = "checkbox";
    hwCheckbox.className = "hwCheckbox";
    hwCheckbox.dataset.studentId = studentId;
    hwCheckbox.checked = lessonData[studentId]?.homework || false;
    cell3.appendChild(hwCheckbox);
  });

  // Mostrar modal
  modal.style.display = "flex";

  // Configurar botão Save
  const saveBtn = document.getElementById("saveLessonBtn");
  saveBtn.onclick = null; // Limpar eventos anteriores
  saveBtn.onclick = async function() {
    try {
      const lessonDataToSave = {};
      
      // Coletar dados dos checkboxes
      const rows = modalTable.rows;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const studentId = row.querySelector('.attCheckbox').dataset.studentId;
        const attendance = row.querySelector('.attCheckbox').checked;
        const homework = row.querySelector('.hwCheckbox').checked;
        
        lessonDataToSave[studentId] = {
          attendance: attendance,
          homework: homework
        };
      }

      await setDoc(lessonDocRef, lessonDataToSave);
      modal.style.display = "none";
      showLessons(); // Atualizar cores das aulas
      
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar: " + error.message);
    }
  };

  // Botão Close
  const closeBtn = document.getElementById("closeLessonBtn");
  closeBtn.onclick = function() {
    modal.style.display = "none";
  };
}

// Fechar modal de aula ao clicar fora
document.getElementById("lessonModal").addEventListener("click", (e) => {
  if (e.target.id === "lessonModal") {
    document.getElementById("lessonModal").style.display = "none";
  }
});
