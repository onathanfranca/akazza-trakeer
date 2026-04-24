// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCHV0uvoPsgUbGBb9tAnYqLtT6KL89tWKQ",
  authDomain: "akazzatracker.firebaseapp.com",
  projectId: "akazzatracker",
  storageBucket: "akazzatracker.firebasestorage.app",
  messagingSenderId: "743896201323",
  appId: "1:743896201323:web:5be570908f15997b74192e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);
export default app;
