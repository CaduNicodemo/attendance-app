import { db, auth, app } from "./config.js";
import {
  collection, addDoc, getDocs, doc, deleteDoc,
  setDoc, getDoc, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// 🔹 Função auxiliar para gerar uma cor aleatória bonita (será salva no grupo)
function generateRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`;
}

let currentUser = null;
let currentGroup = null;

// Espera o usuário logar
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
// 🔹 ADICIONAR GRUPO COM COR ESPECÍFICA
// =======================================================
document.getElementById("addGroupBtn").addEventListener("click", async () => {
    console.log("Botão Add Group clicado!")
  const groupName = document.getElementById("groupName").value.trim();
  const groupTypeSelect = document.getElementById("groupType");
  const groupType = groupTypeSelect.value;
  const groupLevel = groupTypeSelect.selectedOptions[0].dataset.level;

  if (!groupName) {
    alert("Please enter a group name.");
    return;
  }

  // Gera uma cor e salva no Firestore
  const color = generateRandomColor();

  await addDoc(collection(db, "groups"), {
    userId: currentUser.uid,
    name: groupName,
    type: groupType,
    level: groupLevel,
    color: color, // 🔸 cor salva junto
    createdAt: new Date(),
  });

  document.getElementById("groupName").value = "";
});

// =======================================================
// 🔹 CARREGAR GRUPOS (E MOSTRAR CORES)
// =======================================================
async function loadGroups() {
  const q = collection(db, "groups");
  const snapshot = await getDocs(q);

  const groupsDiv = document.getElementById("groupsButtons");
  groupsDiv.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const group = docSnap.data();

    if (group.userId === currentUser.uid) {
      const btn = document.createElement("button");
      btn.textContent = group.name;

      // 🔸 Usa a cor salva (ou gera uma nova, caso grupo antigo)
      const color = group.color || generateRandomColor();
      btn.style.backgroundColor = color;
      btn.style.color = "#fff";
      btn.style.border = "none";
      btn.style.padding = "8px 14px";
      btn.style.margin = "4px";
      btn.style.borderRadius = "6px";
      btn.style.cursor = "pointer";

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
}

// =======================================================
// (As funções de aluno, classes e flagged students seguem como antes)
// =======================================================

// Exemplo de função existente mantida
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
