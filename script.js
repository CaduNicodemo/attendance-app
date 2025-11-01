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
  const q = collection(db, "groups");

  // 🔁 onSnapshot: atualiza automaticamente ao adicionar/excluir grupo
  onSnapshot(q, (snapshot) => {
    const groupsDiv = document.getElementById("groupsButtons");
    groupsDiv.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const group = docSnap.data();

      if (group.userId === currentUser.uid) {
        const btn = document.createElement("button");
        btn.textContent = group.name;

        // 🔹 Usa cor salva (ou padrão caso grupo antigo)
        const color = group.color || "#007bff";
        btn.style.backgroundColor = color;
        btn.style.color = "#fff";
        btn.className = "group-button";

        // 🔹 Atualiza Firestore se o grupo ainda não tinha cor
        if (!group.color) {
          updateDoc(doc(db, "groups", docSnap.id), { color });
        }

        btn.addEventListener("click", () => {
          currentGroup = { id: docSnap.id, ...group };
          loadStudents(docSnap.id);
        });

        groupsDiv.appendChild(btn);
      }
    });
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
