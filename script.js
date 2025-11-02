// =======================================================
// 🔹 IMPORTS
// =======================================================
import { db, auth } from "./config.js";
import {
  collection, addDoc, getDocs, doc, deleteDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let currentUser = null;
let selectedGroupId = null;
let selectedGroupColor = null;

// =======================================================
// 🔹 LOGIN STATUS
// =======================================================
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
    const userGroupsRef = collection(db, "users", currentUser.uid, "groups");
    await addDoc(userGroupsRef, {
      name: groupName,
      type: groupType,
      level: groupLevel,
      color: color,
      createdAt: new Date(),
    });

    document.getElementById("groupName").value = "";
    loadGroups();
  } catch (err) {
    console.error("Erro ao adicionar grupo:", err);
  }
});

// =======================================================
// 🔹 CARREGAR GRUPOS DO USUÁRIO
// =======================================================
async function loadGroups() {
  const user = auth.currentUser;
  if (!user) return;

  const groupsRef = collection(db, "users", user.uid, "groups");
  const querySnapshot = await getDocs(groupsRef);

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
  loadStudents();
  showLessons();
}

// =======================================================
// 🔹 DELETAR GRUPO
// =======================================================
document.getElementById("deleteGroupBtn").addEventListener("click", async () => {
  if (!selectedGroupId || !currentUser) return;
  if (!confirm("Tem certeza que deseja deletar este grupo?")) return;

  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "groups", selectedGroupId));
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
    <tr><th>Name</th><th>Attendance</th><th>Homework</th><th>Delete</th></tr>
  `;

  const studentsRef = collection(db, "users", currentUser.uid, "groups", selectedGroupId, "students");
  const snapshot = await getDocs(studentsRef);

  snapshot.forEach((docSnap) => {
    const student = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${student.name}</td>
      <td><input type="checkbox" class="attCheckbox"></td>
      <td><input type="checkbox" class="hwCheckbox"></td>
      <td><button class="deleteStudentBtn" data-id="${docSnap.id}">X</button></td>
    `;
    studentsTable.appendChild(tr);
  });
}

// =======================================================
// 🔹 ADICIONAR ALUNO
// =======================================================
document.getElementById("addStudentBtn").addEventListener("click", async () => {
  const name = document.getElementById("studentName").value.trim();
  if (!name || !selectedGroupId) return;

  const studentsRef = collection(db, "users", currentUser.uid, "groups", selectedGroupId, "students");
  await addDoc(studentsRef, { name });

  document.getElementById("studentName").value = "";
  loadStudents();
});

// =======================================================
// 🔹 MOSTRAR AULAS (duas passadas + duas próximas)
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
    lessons.push({
      date: d.toISOString().split("T")[0],
      title: i < 0 ? "Previous lesson" : "Next lesson"
    });
  }

  lessons.forEach(lesson => {
    const div = document.createElement("div");
    div.classList.add("lesson-item");
    div.textContent = `${lesson.title}: ${lesson.date}`;
    container.appendChild(div);
  });
}
