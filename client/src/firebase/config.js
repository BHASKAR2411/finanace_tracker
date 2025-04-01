import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider} from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC4e6SkJ4nAPXB9lZGKJLidd87qNY1sjAA",
  authDomain: "finance-tracker-e4a92.firebaseapp.com",
  projectId: "finance-tracker-e4a92",
  storageBucket: "finance-tracker-e4a92.firebasestorage.app",
  messagingSenderId: "217688773917",
  appId: "1:217688773917:web:3ae20b0778f9ebeee87df4",
  measurementId: "G-VFDC8DN23E"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const storage = getStorage(app);

export { auth };