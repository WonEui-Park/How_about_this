import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

function makeEmail(pbnum, name) {
  const safePbnum = pbnum.trim().replace(/\s+/g, "_");
  const safeName = name.trim().replace(/\s+/g, "_");

  return `${safePbnum}_${safeName}@howabout.local`;
}

export async function signUpUser({ pbnum, name, password }) {
  const email = makeEmail(pbnum, name);

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    name,
    pbnum,
    affiliation: "",
    teamName: "",
    role: "",
    isAdmin: false,
    createdAt: serverTimestamp()
  });

  return user;
}

export async function loginUser({ pbnum, name, password }) {
  const email = makeEmail(pbnum, name);

  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  return userCredential.user;
}