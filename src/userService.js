import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function getUserProfile(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("사용자 정보를 찾을 수 없습니다.");
  }

  return {
    uid,
    ...userSnap.data()
  };
}

export async function updateUserProfile(uid, data) {
  const userRef = doc(db, "users", uid);

  await updateDoc(userRef, {
    affiliation: data.affiliation,
    teamName: data.teamName,
    role: data.role
  });
}