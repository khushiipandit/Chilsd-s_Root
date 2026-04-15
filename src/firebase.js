import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";  // Enable Storage in Firebase Console → Storage

const firebaseConfig = {
  apiKey: "AIzaSyCIP9uG-ZeQHt89IsMhFcdquDyMeJWh5a0",
  authDomain: "child-care-major-project.firebaseapp.com",
  projectId: "child-care-major-project",
  storageBucket: "child-care-major-project.firebasestorage.app",
  messagingSenderId: "935777289505",
  appId: "1:935777289505:web:dcc6656406643792432a60"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
