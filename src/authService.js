import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { auth, db } from "./firebase";

function makeEmail(pbnum, name) {
  const safePbnum = pbnum.trim().replace(/\s+/g, "_");
  const safeName = name.trim().replace(/\s+/g, "_");

  return `${safePbnum}_${safeName}@howabout.local`;
}

export async function signUpUser({ pbnum, name, password, affiliation  }) {
  const email = makeEmail(pbnum, name);

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name,
    pbnum,
    affiliation: affiliation || "",
    teamName: "",
    role: "",
    isAdmin: false,
    createdAt: serverTimestamp()
  });

  return user;
}

export async function loginUser({ name, password }) {
  const safeName = name.trim();

  if (!safeName) {
    throw new Error("이름을 입력해주세요.");
  }

  if (!password) {
    throw new Error("비밀번호를 입력해주세요.");
  }

  const usersRef = collection(db, "users");

  const q = query(
    usersRef,
    where("name", "==", safeName)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("등록된 이름이 없습니다.");
  }

  if (querySnapshot.size > 1) {
    throw new Error(
      "같은 이름의 사용자가 여러 명 있습니다. 이름만으로 로그인할 수 없습니다."
    );
  }

  const userData = querySnapshot.docs[0].data();

  const email = makeEmail(userData.pbnum, userData.name);

  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  return userCredential.user;
}