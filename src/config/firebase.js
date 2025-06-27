import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB0VPHNtniLb73G3a26pEzIUw11fJY4cFc",
  authDomain: "dryfruits-8a3f8.firebaseapp.com",
  projectId: "dryfruits-8a3f8",
  storageBucket: "dryfruits-8a3f8.firebasestorage.app",
  messagingSenderId: "319848961362",
  appId: "1:319848961362:web:c0c4bc9b734910dd53568b",
  measurementId: "G-H1BD0XW4YW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db }; 