import { doc, getDoc } from "firebase/firestore";
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