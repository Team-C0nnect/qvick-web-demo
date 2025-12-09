// Firebase 설정
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA1tJvWuL-dShTGv-X4mLc1ufkMtQ55GG4",
  authDomain: "qvick-d42f4.firebaseapp.com",
  projectId: "qvick-d42f4",
  storageBucket: "qvick-d42f4.firebasestorage.app",
  messagingSenderId: "290707791574",
  appId: "1:290707791574:web:1bf699d4e5440686d87377"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 인스턴스
export const db = getFirestore(app);

export default app;
