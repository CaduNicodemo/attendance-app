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
// 🔹 NOVO: Coletar dias selecionados
  const lessonDays = [];
  document.querySelectorAll('#groupDays input[type="checkbox"]:checked').forEach(checkbox => {
    lessonDays.push(parseInt(checkbox.value)); // Converte para número
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
// 🔹 MOSTRAR AULAS (2 passadas + 2 futuras)
// =======================================================
async function showLessons() {
  const container = document.getElementById("lessonsList");
  container.innerHTML = "";

  const today = new Date();
  const lessons = [];

  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const d = new Date();
    d.setDate(today.getDate() + i * 7);

    // Format DD/MM/YYYY
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const dateFormatted = `${day}/${month}/${year}`;

    lessons.push({ date: dateFormatted, isoDate: d.toISOString().split("T")[0] });
  }

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
}
// =======================================================
// 🔹 ABRIR MODAL DE AULA
// =======================================================
async function openLessonModal(lessonDate) {
  if (!selectedGroupId) {
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

  modalTable.innerHTML = `
    <tr>
      <th>Student</th>
      <th>Attendance</th>
      <th>Homework</th>
    </tr>
  `;

  const studentsRef = collection(db, "groups", selectedGroupId, "students");
  const studentsSnapshot = await getDocs(studentsRef);

  const lessonDocRef = doc(db, "groups", selectedGroupId, "lessons", lessonDate);
  const lessonSnapshot = await getDoc(lessonDocRef);
  const lessonData = lessonSnapshot.exists() ? lessonSnapshot.data() : {};

  studentsSnapshot.forEach(studentDoc => {
    const student = studentDoc.data();
    const studentId = studentDoc.id;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${student.name}</td>
      <td><input type="checkbox" class="attCheckbox" data-student-id="${studentId}" ${lessonData[studentId]?.attendance ? "checked" : ""}></td>
      <td><input type="checkbox" class="hwCheckbox" data-student-id="${studentId}" ${lessonData[studentId]?.homework ? "checked" : ""}></td>
    `;
    modalTable.appendChild(tr);
  });

  modal.style.display = "flex";

  document.getElementById("saveLessonBtn").onclick = async () => {
    const lessonDataToSave = {};
    document.querySelectorAll("#lessonModalTable tr").forEach(row => {
      const studentId = row.querySelector(".attCheckbox")?.dataset.studentId;
      if (studentId) {
        lessonDataToSave[studentId] = {
          attendance: row.querySelector(".attCheckbox").checked,
          homework: row.querySelector(".hwCheckbox").checked
        };
      }
    });

    await setDoc(lessonDocRef, lessonDataToSave);
    modal.style.display = "none";
    showLessons(); // Atualiza as cores
  };
}

// Fechar modal
document.getElementById("closeLessonBtn").addEventListener("click", () => {
  document.getElementById("lessonModal").style.display = "none";
});
