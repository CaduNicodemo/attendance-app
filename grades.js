// =======================================================
// 🔹 IMPORTS
// =======================================================
import { db, auth } from "./config.js";
import { mapGroupTypeToLevel } from "./config.js"; // ← ADICIONAR ESTA LINHA
import {
    collection, addDoc, getDocs, doc, getDoc,
    query, where, setDoc, updateDoc, deleteDoc,
    onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// =======================================================
// 🔹 CONFIGURAÇÃO DOS NÍVEIS
// =======================================================
const levelsConfig = {
    "Kids": {
        categories: [
            "Participation in Class",
            "Language Comprehension",
            "Language Production",
            "Respects Rules",
            "Teamwork",
            "Homework",
            "Absences"
        ],
        concepts: ["R", "ST", "MT", "AA"],
        conceptLegend: "R=Rarely, ST=Some of Time, MT=Most of Time, AA=Almost Always"
    },
    "Juniors": {
        categories: [
            "Participation in Class",
            "Engage in Conversations and Respond Properly",
            "Engagement in Storytelling Activities",
            "Be Kind, Respectful, and Helpful",
            "Autonomy to do Tasks and Use Materials",
            "Regular Completion of Homework",
            "Use Keywords and Short Sentences in Writing",
            "Oral Spelling",
            "Absences"
        ],
        concepts: ["R", "ST", "MT", "AA"],
        conceptLegend: "R=Rarely, ST=Some of Time, MT=Most of Time, AA=Almost Always"
    },
    "Juniors1-2": {
        categories: [
            "Participation in Class", "Listening", "Speaking", "Reading", "Writing",
            "Respects Rules", "Cooperation with Peers", "Works Independently",
            "Care with Material", "Homework", "Absences"
        ],
        concepts: ["NI", "S", "G", "VG", "E"],
        conceptLegend: "NI=Needs Improvement, S=Satisfactory, G=Good, VG=Very Good, E=Excellent"
    },
    "TeensA1-2": {
        categories: [
            "Participation in Class", "Listening", "Speaking", "Reading", "Writing",
            "Respects Rules", "Cooperation with Peers", "Works Independently",
            "Care with Material", "Homework", "Absences", "Portfolio"
        ],
        concepts: ["NI", "S", "G", "VG", "E"],
        conceptLegend: "NI=Needs Improvement, S=Satisfactory, G=Good, VG=Very Good, E=Excellent"
    },
    "Teens3-6": {
        categories: [
            "Participation in Class", "Listening", "Speaking", "Reading", "Writing",
            "Respects Rules", "Cooperation with Peers", "Works Independently",
            "Care with Material", "Homework", "Absences", "Portfolio", "Project1", "Project2"
        ],
        concepts: ["NI", "S", "G", "VG", "E"],
        conceptLegend: "NI=Needs Improvement, S=Satisfactory, G=Good, VG=Very Good, E=Excellent"
    }
};

// =======================================================
// 🔹 VARIÁVEIS GLOBAIS
// =======================================================
let currentUser = null;
let selectedGroupId = null;
let selectedGroupData = null;
let selectedStudentId = null;
let selectedCategory = null;
let currentLevel = null;
let currentLevelConfig = null;

// Auto-save variables
let autoSaveTimer = null;
let commentsChanged = false;
let gradesChanged = false;

// =======================================================
// 🔹 INIT
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
    if (!auth) {
        console.error("Firebase Auth não inicializado.");
        return;
    }
    
    setupEventListeners();
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            document.getElementById("userInfo").textContent = user.email;
            loadUserGroups();
        } else {
            window.location.href = "index.html";
        }
    });
});

// =======================================================
// 🔹 SETUP EVENT LISTENERS
// =======================================================
function setupEventListeners() {
    // Group selection
    document.getElementById("selectGroupForGrades").addEventListener("change", (e) => {
        if (e.target.value) {
            selectGroupForGrades(e.target.value);
        } else {
            document.getElementById("gradesSystem").style.display = "none";
        }
    });
    
    // Category selection
    document.getElementById("categorySelect").addEventListener("change", (e) => {
        selectedCategory = e.target.value;
        loadConceptsGrid();
        loadStudentsForCategory();
    });
    
    // View toggle
    document.getElementById("viewToggleBtn").addEventListener("click", toggleView);
    document.getElementById("backToClassBtn").addEventListener("click", () => {
        showClassView();
    });
    
    // Comments auto-save
    const commentsTextarea = document.getElementById("studentComments");
    if (commentsTextarea) {
        commentsTextarea.addEventListener("input", () => {
            commentsChanged = true;
            startAutoSaveTimer();
        });
    }
}

// =======================================================
// 🔹 AUTO-SAVE SYSTEM
// =======================================================
function startAutoSaveTimer() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    
    autoSaveTimer = setTimeout(() => {
        saveAllChanges();
    }, 2000); // Auto-save every 2 seconds
}

function showSaveNotification() {
    const notice = document.getElementById("autoSaveNotice");
    notice.classList.add("show");
    
    setTimeout(() => {
        notice.classList.remove("show");
    }, 2000);
}

saveAllChanges()
    try {
        let savedSomething = false;
        
        // Save comments if changed
        if (commentsChanged && selectedStudentId) {
            await saveComments();
            commentsChanged = false;
            savedSomething = true;
        }
        
        // Save grades if changed
        if (gradesChanged && selectedStudentId && selectedCategory) {
            await saveGradeToFirebase();
            gradesChanged = false;
            savedSomething = true;
        }
        
        if (savedSomething) {
            showSaveNotification();
        }
        
    } catch (error) {
        console.error("Auto-save error:", error);
    }

// =======================================================
// 🔹 LOAD USER GROUPS
// =======================================================
async function loadUserGroups() {
    if (!currentUser) return;
    
    try {
        const groupsRef = collection(db, "groups");
        const q = query(groupsRef, where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        const select = document.getElementById("selectGroupForGrades");
        select.innerHTML = '<option value="">-- Select a Group --</option>';
        
        if (querySnapshot.empty){
            console.log("No groups found for user.");
            const option = document.createElement("option");
            option.textContent = "No groups available";
            option.disabled = true;
            select.appendChild(option);
            return
        };
        console.log(`Found ${querySnapshot.size} groups`);

        querySnapshot.forEach((docSnap) => {
            const group = docSnap.data();
            console.log("Group:", group);
            
            const option = document.createElement("option");
            option.value = docSnap.id;

            const groupType = group.type || group.Type || '';
            const groupLevel = group.level || group.Level || determineLevelFromType(groupType);
            
            option.textContent = `${group.name} (${groupType})`;
            option.dataset.level = groupLevel;
            option.dataset.type = groupType;
            
            select.appendChild(option);
        });
        
        console.log("Groups loaded successfully");

    } catch (error) {
        console.error("Error loading groups:", error);
        alert("Error loading groups: " + error.message);
 // Fallback: mostrar mensagem amigável
        const select = document.getElementById("selectGroupForGrades");
        select.innerHTML = '<option value="">-- Select a Group --</option>';
        const option = document.createElement("option");
        option.textContent = "Error loading groups. Please refresh.";
        option.disabled = true;
        select.appendChild(option);
    }
}

// =======================================================
// 🔹 DETERMINE LEVEL FROM TYPE (fallback)
// =======================================================
function determineLevelFromType(type) {
    // Mapeamento de tipo para nível se não tiver level salvo
    return mapGroupTypeToLevel(type);
}
// =======================================================
// 🔹 SELECT GROUP FOR GRADES
// =======================================================
async function selectGroupForGrades(groupId) {
    selectedGroupId = groupId;
    selectedStudentId = null;
    
    try {
        // Get group info
        const groupDoc = await getDoc(doc(db, "groups", groupId));
        if (groupDoc.exists()) {
            selectedGroupData = groupDoc.data();
            
            // Determine level
            const groupLevel = selectedGroupData.level || "Kids";
            currentLevel = groupLevel;
            currentLevelConfig = levelsConfig[groupLevel] || levelsConfig["Kids"];
            
            // Update UI
            document.getElementById("currentGroupName").textContent = `Group: ${selectedGroupData.name}`;
            document.getElementById("levelInfo").innerHTML = `
                <strong>Level:</strong> ${groupLevel}<br>
                <small>${currentLevelConfig.conceptLegend}</small>
            `;
            
            // Show grades system
            document.getElementById("gradesSystem").style.display = "block";
            showClassView();
            
            // Load categories
            loadCategories();
            
            // Load students
            await loadAllStudents();
            
            // Load first category by default
            if (currentLevelConfig.categories.length > 0) {
                selectedCategory = currentLevelConfig.categories[0];
                loadConceptsGrid();
                loadStudentsForCategory();
            }
        }
        
    } catch (error) {
        console.error("Error selecting group:", error);
    }
}

// =======================================================
// 🔹 LOAD CATEGORIES
// =======================================================
function loadCategories() {
    const select = document.getElementById("categorySelect");
    select.innerHTML = '';
    
    currentLevelConfig.categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
    
    // Update legend
    document.getElementById("conceptLegend").textContent = currentLevelConfig.conceptLegend;
}

// =======================================================
// 🔹 LOAD CONCEPTS GRID
// =======================================================
function loadConceptsGrid() {
    const grid = document.getElementById("conceptsGrid");
    grid.innerHTML = '';
    
    currentLevelConfig.concepts.forEach(concept => {
        const conceptDiv = document.createElement("div");
        conceptDiv.className = "concept-option";
        conceptDiv.textContent = concept;
        conceptDiv.dataset.concept = concept;
        
        conceptDiv.addEventListener("click", () => {
            // Remove selection from all
            document.querySelectorAll('.concept-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Select this one
            conceptDiv.classList.add('selected');
            
            // If a student is selected in class view, apply the concept
            const selectedStudentRow = document.querySelector('.student-row.selected');
            if (selectedStudentRow && selectedCategory) {
                const studentId = selectedStudentRow.dataset.studentId;
                applyConceptToStudent(studentId, concept);
            }
        });
        
        grid.appendChild(conceptDiv);
    });
}

// =======================================================
// 🔹 LOAD ALL STUDENTS
// =======================================================
async function loadAllStudents() {
    if (!selectedGroupId) return;
    
    try {
        const studentsRef = collection(db, "groups", selectedGroupId, "students");
        const snapshot = await getDocs(studentsRef);
        
        // We'll store students globally for later use
        window.allStudents = [];
        snapshot.forEach(docSnap => {
            window.allStudents.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        
        // Sort by name
        window.allStudents.sort((a, b) => a.name.localeCompare(b.name));
        
    } catch (error) {
        console.error("Error loading students:", error);
    }
}

// =======================================================
// 🔹 LOAD STUDENTS FOR CATEGORY
// =======================================================
async function loadStudentsForCategory() {
    if (!selectedGroupId || !selectedCategory) return;
    
    const container = document.getElementById("studentsList");
    const studentsDiv = document.createElement("div");
    
    window.allStudents.forEach(student => {
        const studentRow = document.createElement("div");
        studentRow.className = "student-row";
        studentRow.dataset.studentId = student.id;
        
        // Create student info
        studentRow.innerHTML = `
            <div class="student-name">${student.name}</div>
            <div class="student-concepts" id="concepts-${student.id}">
                <!-- Concepts will be loaded here -->
            </div>
        `;
        
        // Click to select student
        studentRow.addEventListener("click", () => {
            // Remove selection from all
            document.querySelectorAll('.student-row').forEach(row => {
                row.classList.remove('selected');
            });
            
            // Select this one
            studentRow.classList.add('selected');
            
            // Load student's concept for this category
            loadStudentConcept(student.id, selectedCategory);
        });
        
        studentsDiv.appendChild(studentRow);
        
        // Load student's concept
        loadStudentConcept(student.id, selectedCategory);
    });
    
    // Update container
    const title = container.querySelector('h5');
    container.innerHTML = '';
    if (title) container.appendChild(title);
    container.appendChild(studentsDiv);
}

// =======================================================
// 🔹 LOAD STUDENT CONCEPT
// =======================================================
async function loadStudentConcept(studentId, category) {
    try {
        const gradeDocRef = doc(db, "groups", selectedGroupId, "students", studentId, "grades", category);
        const gradeDoc = await getDoc(gradeDocRef);
        
        const conceptsContainer = document.getElementById(`concepts-${studentId}`);
        if (!conceptsContainer) return;
        
        conceptsContainer.innerHTML = '';
        
        if (gradeDoc.exists()) {
            const gradeData = gradeDoc.data();
            const concept = gradeData.concept || '';
            
            if (concept) {
                const conceptBadge = document.createElement("div");
                conceptBadge.className = "concept-badge";
                conceptBadge.textContent = concept;
                conceptBadge.style.background = getConceptColor(concept);
                conceptBadge.style.color = "white";
                conceptsContainer.appendChild(conceptBadge);
            }
        }
        
    } catch (error) {
        console.error("Error loading student concept:", error);
    }
}

// =======================================================
// 🔹 APPLY CONCEPT TO STUDENT
// =======================================================
async function applyConceptToStudent(studentId, concept) {
    if (!selectedGroupId || !selectedCategory) return;
    
    try {
        const gradeDocRef = doc(db, "groups", selectedGroupId, "students", studentId, "grades", selectedCategory);
        
        await setDoc(gradeDocRef, {
            concept: concept,
            category: selectedCategory,
            studentId: studentId,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid
        }, { merge: true });
        
        // Update UI immediately
        loadStudentConcept(studentId, selectedCategory);
        gradesChanged = true;
        startAutoSaveTimer();
        
    } catch (error) {
        console.error("Error applying concept:", error);
        alert("Error saving grade: " + error.message);
    }
    // Na função applyConceptToStudentInIndividualView, adicione no final:
showGradeSaveNotification(category, concept);
}

// =======================================================
// 🔹 SHOW INDIVIDUAL VIEW
// =======================================================
function showIndividualView(studentId) {
    selectedStudentId = studentId;
    
    // Find student data
    const student = window.allStudents.find(s => s.id === studentId);
    if (!student) return;
    
    // Update UI
    document.getElementById("classView").style.display = "none";
    document.getElementById("individualView").style.display = "block";
    document.getElementById("studentIndividualName").textContent = student.name;
    document.getElementById("viewToggleBtn").textContent = "Switch to Class View";
    
    // Load all categories for this student
    loadStudentAllCategories(studentId);
    
    // Load comments
    loadStudentComments(studentId);
}

// =======================================================
// 🔹 SHOW CLASS VIEW
// =======================================================
function showClassView() {
    selectedStudentId = null;
    
    document.getElementById("classView").style.display = "block";
    document.getElementById("individualView").style.display = "none";
    document.getElementById("viewToggleBtn").textContent = "Switch to Individual View";
    
    // Reload current category
    if (selectedCategory) {
        loadStudentsForCategory();
    }
}

// =======================================================
// 🔹 TOGGLE VIEW
// =======================================================
function toggleView() {
    if (selectedStudentId) {
        showClassView();
    } else {
        // If a student is selected in class view, switch to individual
        const selectedStudentRow = document.querySelector('.student-row.selected');
        if (selectedStudentRow) {
            showIndividualView(selectedStudentRow.dataset.studentId);
        } else {
            alert("Please select a student first to view individual assessment.");
        }
    }
}

// =======================================================
// 🔹 LOAD STUDENT ALL CATEGORIES
// =======================================================
async function loadStudentAllCategories(studentId) {
    const container = document.getElementById("studentAllCategories");
    container.innerHTML = '<h5>All Categories</h5>';
    
    for (const category of currentLevelConfig.categories) {
        const categoryDiv = document.createElement("div");
        categoryDiv.className = "category-item";
        
        // Create category header
        categoryDiv.innerHTML = `
            <div class="category-name">${category}</div>
            <div class="concept-grid" id="category-${category.replace(/\s+/g, '-')}">
                <!-- Concepts will be loaded here -->
            </div>
        `;
        
        container.appendChild(categoryDiv);
        
        // Load current concept for this category
        await loadStudentCategoryConcept(studentId, category);
    }
}

// =======================================================
// 🔹 LOAD STUDENT CATEGORY CONCEPT (COM AUTO-SAVE)
// =======================================================
async function loadStudentCategoryConcept(studentId, category) {
    try {
        const gradeDocRef = doc(db, "groups", selectedGroupId, "students", studentId, "grades", category);
        const gradeDoc = await getDoc(gradeDocRef);
        
        const grid = document.getElementById(`category-${category.replace(/\s+/g, '-')}`);
        if (!grid) return;
        
        grid.innerHTML = '';
        
        let currentConcept = '';
        if (gradeDoc.exists()) {
            const gradeData = gradeDoc.data();
            currentConcept = gradeData.concept || '';
        }
        
        // Create concept options
        currentLevelConfig.concepts.forEach(concept => {
            const conceptDiv = document.createElement("div");
            conceptDiv.className = `concept-option ${concept === currentConcept ? 'selected' : ''}`;
            conceptDiv.textContent = concept;
            conceptDiv.dataset.concept = concept;
            conceptDiv.dataset.category = category; // Adicionar categoria
            conceptDiv.style.background = concept === currentConcept ? getConceptColor(concept) : '';
            conceptDiv.style.color = concept === currentConcept ? 'white' : '';
            
            conceptDiv.addEventListener("click", async () => {
                // Apply concept to this category
                await applyConceptToStudentInIndividualView(studentId, category, concept);
                
                // Update UI
                document.querySelectorAll(`#category-${category.replace(/\s+/g, '-')} .concept-option`).forEach(opt => {
                    opt.classList.remove('selected');
                    opt.style.background = '';
                    opt.style.color = '';
                });
                
                conceptDiv.classList.add('selected');
                conceptDiv.style.background = getConceptColor(concept);
                conceptDiv.style.color = 'white';
            });
                updateClassViewIfNeeded(studentId, category, concept);

            grid.appendChild(conceptDiv);
        });
        
    } catch (error) {
        console.error("Error loading category concept:", error);
    }
}
// =======================================================
// 🔹 APPLY CONCEPT IN INDIVIDUAL VIEW (COM AUTO-SAVE)
// =======================================================
async function applyConceptToStudentInIndividualView(studentId, category, concept) {
    if (!selectedGroupId || !category || !concept) return;
    
    try {
        const gradeDocRef = doc(db, "groups", selectedGroupId, "students", studentId, "grades", category);
        
        await setDoc(gradeDocRef, {
            concept: concept,
            category: category,
            studentId: studentId,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid
        }, { merge: true });
        
        console.log(`Grade saved: ${studentId} - ${category} = ${concept}`);
        
        // Trigger auto-save
        gradesChanged = true;
        startAutoSaveTimer();
        
        // Also update the class view if it's visible
        updateClassViewIfNeeded(studentId, category, concept);
        
    } catch (error) {
        console.error("Error saving concept in individual view:", error);
        alert("Error saving grade: " + error.message);
    }
}
// =======================================================
// 🔹 LOAD STUDENT COMMENTS
// =======================================================
async function loadStudentComments(studentId) {
    try {
        const commentsDocRef = doc(db, "groups", selectedGroupId, "students", studentId, "metadata", "comments");
        const commentsDoc = await getDoc(commentsDocRef);
        
        const textarea = document.getElementById("studentComments");
        if (textarea) {
            if (commentsDoc.exists()) {
                textarea.value = commentsDoc.data().comments || '';
            } else {
                textarea.value = '';
            }
        }
        
    } catch (error) {
        console.error("Error loading comments:", error);
    }
}
// =======================================================
// 🔹 SAVE ALL CHANGES (VERSÃO COMPLETA)
// =======================================================
async function saveAllChanges() {
    try {
        let savedSomething = false;
        
        // Save comments if changed
        if (commentsChanged && selectedStudentId) {
            await saveComments();
            commentsChanged = false;
            savedSomething = true;
            console.log("Auto-save: Comments saved");
        }
        
        // Note: Grades are already saved immediately when clicked
        // This function is just for backup/consistency
        if (gradesChanged) {
            gradesChanged = false; // Reset flag since grades are saved immediately
            savedSomething = true;
            console.log("Auto-save: Grades already saved");
        }
        
        if (savedSomething) {
            showSaveNotification();
        }
        
    } catch (error) {
        console.error("Auto-save error:", error);
    }
}// =======================================================
// 🔹 SHOW GRADE SAVE NOTIFICATION
// =======================================================
function showGradeSaveNotification(category, concept) {
    const notice = document.getElementById("autoSaveNotice");
    if (!notice) return;
    
    notice.textContent = `✓ ${category}: ${concept} saved`;
    notice.style.background = getConceptColor(concept);
    notice.classList.add("show");
    
    setTimeout(() => {
        notice.classList.remove("show");
        setTimeout(() => {
            notice.textContent = "✓ Changes saved";
            notice.style.background = ""; // Reset to default
        }, 300);
    }, 1500);
}
// =======================================================
// 🔹 SAVE GRADE TO FIREBASE (for auto-save)
// =======================================================
async function saveGradeToFirebase() {
    // This would save the current grade if needed
    // Implementation depends on what needs to be saved
}

// =======================================================
// 🔹 HELPER FUNCTIONS
// =======================================================
function getConceptColor(concept) {
    const colorMap = {
        'AA': '#2ecc71', 'MT': '#3498db', 'ST': '#f39c12', 'R': '#e74c3c',
        'E': '#0b0e0cff', 'VG': '#2980b9', 'G': '#f1c40f', 'S': '#e67e22', 'NI': '#c0392b'
    };
    
    return colorMap[concept] || '#95a5a6';
}

function formatDate(date) {
    if (!date) return "N/A";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}
// =======================================================
// 🔹 DEBOUNCE SYSTEM FOR GRADES
// =======================================================
let gradeSaveQueue = [];
let gradeSaveTimeout = null;

async function queueGradeSave(studentId, category, concept) {
    // Add to queue
    gradeSaveQueue.push({ studentId, category, concept });
    
    // Clear existing timeout
    if (gradeSaveTimeout) {
        clearTimeout(gradeSaveTimeout);
    }
    
    // Set new timeout (debounce 1 second)
    gradeSaveTimeout = setTimeout(async () => {
        await processGradeSaveQueue();
    }, 1000);
}

async function processGradeSaveQueue() {
    if (gradeSaveQueue.length === 0) return;
    
    try {
        // Get the last grade change (most recent)
        const lastChange = gradeSaveQueue[gradeSaveQueue.length - 1];
        
        // Save only the most recent change for each student-category combination
        const uniqueChanges = {};
        gradeSaveQueue.forEach(change => {
            const key = `${change.studentId}-${change.category}`;
            uniqueChanges[key] = change;
        });
        
        // Save all unique changes
        for (const key in uniqueChanges) {
            const { studentId, category, concept } = uniqueChanges[key];
            await applyConceptToStudentInIndividualView(studentId, category, concept);
        }
        
        // Clear queue
        gradeSaveQueue = [];
        
        console.log(`Processed ${Object.keys(uniqueChanges).length} grade changes`);
        
    } catch (error) {
        console.error("Error processing grade queue:", error);
    }
}
// =======================================================
// 🔹 UPDATE CLASS VIEW IF NEEDED
// =======================================================
function updateClassViewIfNeeded(studentId, category, concept) {
    // Only update if we're in the same category and student is visible
    if (selectedCategory === category) {
        const studentRow = document.querySelector(`.student-row[data-student-id="${studentId}"]`);
        if (studentRow) {
            const conceptsContainer = document.getElementById(`concepts-${studentId}`);
            if (conceptsContainer) {
                conceptsContainer.innerHTML = '';
                
                const conceptBadge = document.createElement("div");
                conceptBadge.className = "concept-badge";
                conceptBadge.textContent = concept;
                conceptBadge.style.background = getConceptColor(concept);
                conceptBadge.style.color = "white";
                conceptsContainer.appendChild(conceptBadge);
            }
        }
    }
}
