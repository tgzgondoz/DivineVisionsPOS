import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue, remove, update } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBXvt1f_fM0tNNbWdTzWXiMZJguc6fIne0",
  authDomain: "divinevisionstruckpos.firebaseapp.com",
  databaseURL: "https://divinevisionstruckpos-default-rtdb.firebaseio.com",
  projectId: "divinevisionstruckpos",
  storageBucket: "divinevisionstruckpos.firebasestorage.app",
  messagingSenderId: "719228480436",
  appId: "1:719228480436:web:c591a27c4e2a85d200e0e1",
  measurementId: "G-XNXL8QEYFH"
};

let app = null;
let database = null;

export const initializeFirebase = () => {
  try {
    if (!app) {
      console.log('Initializing Firebase...');
      app = initializeApp(firebaseConfig);
      database = getDatabase(app);
      console.log('Firebase initialized successfully');
    }
    return { app, database };
  } catch (error) {
    console.error('Firebase initialization error details:', error);
    throw error;
  }
};

export const getDatabaseInstance = () => {
  if (!database) {
    initializeFirebase();
  }
  return database;
};

// Export all the functions you need
export { ref, set, push, onValue, remove, update };