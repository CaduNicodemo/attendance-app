import { db, auth, app } from "./config.js";
import {
  collection, addDoc, getDocs, doc, deleteDoc,
  updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let currentUser = null;
let currentGroup = null;

// =======================================================
// 🔹 Espera o usuário logar
// =======================================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("mainApp").style.display = "block";
    document.getElementById("userInfo").textContent = user.email;
    loadGroups(); // Carrega os grupos do usuário logado
  } else {
    window.location.href = "index.html";
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// =======================================================
// 🔹 ADICIONAR GRUPO COM COR SELECIONADA PELO USUÁRIO
// =======================================================
document.getElementById("addGroupBtn").addEventListener("click", async () => {
  const groupName = document.getElementById("groupName").value.trim();
  const groupTypeSelect = document.getElementById("groupType");
  const groupType = groupTypeSelect.value;
  const groupLevel = groupTypeSelect.selectedOptions[0].dataset.level;
  const color = document.getElementById("groupColor").value; // 🎨 Cor escolhida

  if (!groupName) {
    alert("Please enter a group name.");
    return;
  }

  await addDoc(collection(db, "groups"), {
    userId: currentUser.uid,
    name: groupName,
    type: groupType,
    level: groupLevel,
    color: color, // 🔸 salva a cor do input
    createdAt: new Date(),
  });

  document.getElementById("groupName").value = "";
});

// =======================================================
// 🔹 CARREGAR GRUPOS (E MOSTRAR CORES SALVAS)
// =======================================================

async function loadGroups() {
  const user = auth.currentUser;
  if (!user) return;

  const groupsRef = collection(db, "groups");
  const q = query(groupsRef, where("userId", "==", user.uid));
  const querySnapshot = await getDocs(q);

  const container = document.getElementById("groupsButtons");
  container.innerHTML = ""; // limpa antes de renderizar de novo

  querySnapshot.forEach(docSnap => {
    const group = docSnap.data();
    const groupDiv = document.createElement("div");
    groupDiv.classList.add("group-item");

    // botão com cor
    const groupBtn = document.createElement("button");
    groupBtn.textContent = group.name;
    groupBtn.classList.add("group-name");
    groupBtn.style.background = group.color || "var(--azul-grupo)";
    groupBtn.addEventListener("click", () => {
      localStorage.setItem("selectedGroupId", docSnap.id);
      window.location.href = "grades.html";
    });

    // botão de deletar
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.classList.add("delete-group");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // impede o clique de abrir a página do grupo
      deleteGroup(docSnap.id);
    });

    groupDiv.appendChild(groupBtn);
    groupDiv.appendChild(deleteBtn);
    container.appendChild(groupDiv);
  });
}

// =======================================================
// 🔹 CARREGAR ALUNOS DO GRUPO
// =======================================================
async function loadStudents(groupId) {
  const studentsTable = document.getElementById("studentsTable");
  studentsTable.innerHTML = `
    <tr><th>Name</th><th>Delete</th></tr>
  `;

  const studentsSnapshot = await getDocs(collection(db, "groups", groupId, "students"));
  studentsSnapshot.forEach((studentDoc) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${studentDoc.data().name}</td>
      <td><button data-id="${studentDoc.id}" class="deleteStudentBtn">X</button></td>
    `;
    studentsTable.appendChild(tr);
  });

  document.querySelectorAll(".deleteStudentBtn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const studentId = e.target.dataset.id;
      await deleteDoc(doc(db, "groups", groupId, "students", studentId));
      loadStudents(groupId);
    });
  });
}
