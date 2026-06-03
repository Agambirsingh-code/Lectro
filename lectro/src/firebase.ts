import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // ✨ We need to import Firestore

const firebaseConfig = {
  apiKey: "AIzaSyDcrQ13fojDcIpki8O_p0LincAm76x_-3Q",
  authDomain: "lectro-fe80e.firebaseapp.com",
  projectId: "lectro-fe80e",
  storageBucket: "lectro-fe80e.firebasestorage.app",
  messagingSenderId: "958026173352",
  appId: "1:958026173352:web:28dfad8f7c11cd8dbaeb9d",
  measurementId: "G-XTCMBHZ2JJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ✨ Initialize and export the database so the rest of your app can use it!
export const db = getFirestore(app);