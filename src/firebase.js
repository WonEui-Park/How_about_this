
import  { initializeApp }   from "firebase/app";
import  { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { exp } from "firebase/firestore/pipelines";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCwNnHhWOHmdDw8bvJD9P-HsPP4Yoj6wTk",
  authDomain: "how-about-this-aa161.firebaseapp.com",
  projectId: "how-about-this-aa161",
  storageBucket: "how-about-this-aa161.firebasestorage.app",
  messagingSenderId: "7792994899",
  appId: "1:7792994899:web:96336c333b5c989d0a74a6",
  measurementId: "G-M3GPEKTXNF"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);