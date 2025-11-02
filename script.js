import { db, auth } from "./config.js";
import {
  collection, addDoc, getDocs, doc, deleteDoc,
  query, where, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

let currentUser = null;
let selectedGroupId = null;
let selectedGroupColor = null;
let currentLessonDate = null;

// =======================================================
// LOGIN
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

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// =======================================================
// ADD GROUP
document.getElementById("addGroupBtn").addEventListener("click", async () => {
  const groupName = document.getElementById("groupName").value.trim();
  const groupTypeSelect = document.getElementById("groupType");
  const groupType = groupTypeSelect.value;
  const groupLevel = groupTypeSelect.selectedOptions[0].dataset.level;
  const color = document.getElementById("groupColor").value;

  const daysCheckboxes = document.querySelectorAll("#groupDays input[type='checkbox']");
  const daysOfWeek = Array.from(daysCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  if (!groupName) { alert("Enter a group name."); return; }

  try {
    await addDoc(collection(db, "users", currentUser.uid, "groups"), {
      name: groupName,
      type: groupType,
      level: groupLevel,
      color: color,
      daysOfWeek: daysOfWeek,
      createdAt: new Date()
    });
    document.getElementById("groupName").value = "";
    daysCheckboxes.forEach(cb => cb.checked = false);
    loadGroups();
  } catch (err) {
    console.error(err);
  }
});

// =======================================================
// LOAD GROUPS
async function loadGroups() {
  if (!currentUser) return;
  const container = document.getElementById("groupsButtons");
  container.innerHTML = "";
  const snapshot = await getDocs(collection(db, "users", currentUser.uid, "groups"));
  snapshot.forEach(docSnap => {
    const group = docSnap.data();
    const groupDiv = document.createElement("div");
    groupDiv.classList.add("group-item");

    const groupBtn = document.createElement("button");
    groupBtn.textContent = group.name;
    groupBtn.classList.add("group-name");
    groupBtn.style.background = group.color || "var(--azul-grupo)";
    groupBtn.addEventListener("click", () => selectGroup(docSnap.id, group.color));

    groupDiv.appendChild(groupBtn);
    container.appendChild(groupDiv);
  });
}

// =======================================================
// SELECT GROUP
async function selectGroup(groupId, color) {
  selectedGroupId = groupId;
  selectedGroupColor = color;
  document.body.style.background = color;
  document.getElementById("groupDetails").style.display = "block";
  loadStudents();
  showLessons();
}

// =======================================================
// DELETE GROUP
document.getElementById("deleteGroupBtn").addEventListener("click", async () => {
  if (!selectedGroupId) return;
  if (!confirm("Delete group?")) return;

  await deleteDoc(doc(db, "users", currentUser.uid, "groups", selectedGroupId));
  selectedGroupId = null;
  document.getElementById("groupDetails").style.display = "none";
  loadGroups();
});

// =======================================================
// LOAD STUDENTS
async function loadStudents() {
  if (!selectedGroupId) return;
  const table = document.getElementById("studentsTable");
  table.innerHTML = `<tr><th>Name</th><th>Delete</th></tr>`;
  const snapshot = await getDocs(collection(db, "users", currentUser.uid, "groups", selectedGroupId, "students"));

  snapshot.forEach(docSnap => {
    const student = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${student.name}</td><td><button data-id="${docSnap.id}">X</button></td>`;
    table.appendChild(tr);
  });

  table.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      await deleteDoc(doc(db, "users", currentUser.uid, "groups", selectedGroupId, "students", e.target.dataset.id));
      loadStudents();
    });
  });
}

// =======================================================
// ADD STUDENT
document.getElementById("addStudentBtn").addEventListener("click", async () => {
  const name = document.getElementById("studentName").value.trim();
  if (!name || !selectedGroupId) return;
  await addDoc(collection(db, "users", currentUser.uid, "groups", selectedGroupId, "students"), { name });
  document.getElementById("studentName").value = "";
  loadStudents();
});

// =======================================================
// SHOW LESSONS
async function showLessons() {
  if (!selectedGroupId) return;
  const container = document.getElementById("lessonsList");
  container.innerHTML = "";
  const groupDoc = await getDoc(doc(db, "users", currentUser.uid, "groups", selectedGroupId));
  if (!groupDoc.exists()) return;
  const today = new Date();
  const lessons = [];

  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const date = new Date(today);
    date.setDate(today.getDate() + i * 7);
    lessons.push({ date: date.toISOString().split("T")[0], title: i<0?"Previous":"Next" });
  }

  lessons.forEach(lesson => {
    const div = document.createElement("div");
    div.textContent = `${lesson.title} lesson: ${lesson.date}`;
    div.style.cursor = "pointer";
    div.addEventListener("click", () => openLessonModal(lesson.date));
    container.appendChild(div);
  });
}

// =======================================================
// MODAL: PRESENCE & HOMEWORK
// =======================================================
const modal = document.getElementById("lessonModal");
const modalTable = document.getElementById("modalStudentsTable");
const modalTitle = document.getElementById("modalTitle");

document.getElementById("closeLessonBtn").addEventListener("click", () => modal.style.display="none");
document.getElementById("saveLessonBtn").addEventListener("click", saveLessonData);

async function openLessonModal(date) {
  currentLessonDate = date;
  modalTitle.textContent = `Lesson ${date}`;
  modalTable.innerHTML = `<tr><th>Student</th><th>Attendance</th><th>Homework</th></tr>`;

  const studentsSnap = await getDocs(collection(db, "users", currentUser.uid, "groups", selectedGroupId, "students"));
  studentsSnap.forEach(docSnap => {
    const student = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${student.name}</td>
      <td><input type="checkbox" class="attCheckbox" data-id="${docSnap.id}"></td>
      <td><input type="checkbox" class="hwCheckbox" data-id="${docSnap.id}"></td>`;
    modalTable.appendChild(tr);
  });

  // carregar dados já salvos
  const lessonSnap = await getDoc(doc(db, "users", currentUser.uid, "groups", selectedGroupId, "lessons", date));
  if (lessonSnap.exists()) {
    const data = lessonSnap.data();
    modalTable.querySelectorAll(".attCheckbox").forEach(cb => cb.checked = data[cb.dataset.id]?.attendance||false);
    modalTable.querySelectorAll(".hwCheckbox").forEach(cb => cb.checked = data[cb.dataset.id]?.homework||false);
  }

  modal.style.display = "flex";
}

async function saveLessonData() {
  if (!currentLessonDate) return;
  const data = {};
  modalTable.querySelectorAll(".attCheckbox").forEach(cb => {
    data[cb.dataset.id] = { attendance: cb.checked };
  });
  modalTable.querySelectorAll(".hwCheckbox").forEach(cb => {
    if (!data[cb.dataset.id]) data[cb.dataset.id] = {};
    data[cb.dataset.id].homework = cb.checked;
  });

  await setDoc(doc(db, "users", currentUser.uid, "groups", selectedGroupId, "lessons", currentLessonDate), data);
  modal.style.display = "none";
  alert("Saved successfully!");
}
