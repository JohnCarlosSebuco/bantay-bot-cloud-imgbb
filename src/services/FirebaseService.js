import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../config/firebase.config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Enable offline persistence
try {
  enableIndexedDbPersistence(db);
} catch (err) {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence enabled only in first tab');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser does not support offline persistence');
  }
}

export default app;
