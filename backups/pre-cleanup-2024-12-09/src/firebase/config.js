/**
 * Firebase Configuration for MODA
 * 
 * This initializes Firebase Auth and Firestore for the application.
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDntnW81kWQND7lnVJK1Vzowin3naJNKqo",
  authDomain: "moda-9ee0f.firebaseapp.com",
  projectId: "moda-9ee0f",
  storageBucket: "moda-9ee0f.firebasestorage.app",
  messagingSenderId: "189785366880",
  appId: "1:189785366880:web:556705c3abdca5d692be05",
  measurementId: "G-BZQEHHXSYS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
