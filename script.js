// =======================================================
// 🔹 IMPORTS
// =======================================================
import { db, auth } from "./config.js";
import {
  collection, addDoc, getDocs, doc, deleteDoc,
  query, where
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let currentUser = null;

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
    await addDoc(collection(db, "groups"), {
      userId: currentUser.uid,
      name: groupName,
      type: groupType,
      level: groupLevel,
      color: color,
      createdAt: new Date(),
    });

    document.getElementById("groupName").value = "";
    loadGroups(); // recarrega após adicionar
  } catch (err) {
    console.error("Erro ao adicionar grupo:", err);
  }
});

// =======================================================
// 🔹 CARREGAR GRUPOS
// =======================================================
async function loadGroups() {
  const user = auth.currentUser;
  if (!user) return;

  const groupsRef = collection(db, "groups");
  const q = query(groupsRef, where("userId", "==", user.uid));
  const querySnapshot = await getDocs(q);

  const container = document.getElementById("groupsButtons");
  container.innerHTML = "";

  querySnapshot.forEach(docSnap => {
    const group = docSnap.data();
    const groupDiv = document.createElement("div");
    groupDiv.classList.add("group-item");

    // Botão principal do grupo
    const groupBtn = document.createElement("button");
    groupBtn.textContent = group.name;
    groupBtn.classList.add("group-name");
    groupBtn.style.background = group.color || "var(--azul-grupo)";
    groupBtn.addEventListener("click", () => {
      localStorage.setItem("selectedGroupId", docSnap.id);
      window.location.href = "grades.html";
    });

    // Botão de deletar
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.classList.add("delete-group");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteGroup(docSnap.id);
    });

    groupDiv.appendChild(groupBtn);
    groupDiv.appendChild(deleteBtn);
    container.appendChild(groupDiv);
  });
}

// =======================================================
// 🔹 DELETAR GRUPO (mover para JS, não HTML!)
// =======================================================
async function deleteGroup(groupId) {
  if (!confirm("Tem certeza que deseja deletar este grupo?")) return;
  try {
    await deleteDoc(doc(db, "groups", groupId));
    alert("Grupo deletado com sucesso!");
    loadGroups(); // recarrega a lista
  } catch (error) {
    console.error("Erro ao deletar grupo:", error);
    alert("Erro ao deletar grupo.");
  }
}
