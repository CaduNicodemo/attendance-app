// config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAm4kct4BJrVydJpcAXFZuHuEOAtnpUJfc",
  authDomain: "attendance-rb.firebaseapp.com",
  projectId: "attendance-rb",
  storageBucket: "attendance-rb.firebasestorage.app",
  messagingSenderId: "884478984062",
  appId: "1:884478984062:web:e64f5dedafb34ac7d73d2f",
};

// 🔧 FUNÇÃO CENTRAL: Mapeia type para level (ADICIONAR ISSO)
export function mapGroupTypeToLevel(type) {
    const typeMap = {
        // Kids
        'K1': 'Kids', 'K2': 'Kids',
        
        // Juniors
        'J': 'Juniors', 
        'J1': 'Juniors1-2', 'J2': 'Juniors1-2',
        
        // Teens
        'TA': 'TeensA1-2', 'T1': 'TeensA1-2', 'T2': 'TeensA1-2',
        'T3': 'Teens3-6', 'T4': 'Teens3-6', 'T5': 'Teens3-6', 'T6': 'Teens3-6',
        
        // Fallbacks
        'Teens': 'Teens3-6',
        'Teens A1-A2': 'TeensA1-2',
        'Teens 3-6': 'Teens3-6'
    };
    
    return typeMap[type] || 'Teens3-6';
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
