import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA-Q_awR9Swj23_Wr0lExWZ6K1UPMQWl6o",
  authDomain: "blockchain-aab43.firebaseapp.com",
  projectId: "blockchain-aab43",
  storageBucket: "blockchain-aab43.firebasestorage.app",
  messagingSenderId: "835566053873",
  appId: "1:835566053873:web:4c1e1123439b15b2c9fc50",
  measurementId: "G-THNMVPQX3Z"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
