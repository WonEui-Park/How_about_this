import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

export async function getTeamMembers(affiliation, teamName) {
  if (!affiliation || !teamName) {
    return [];
  }

  const usersRef = collection(db, "users");

  const q = query(
    usersRef,
    where("affiliation", "==", affiliation),
    where("teamName", "==", teamName)
  );

  const querySnapshot = await getDocs(q);

  const members = querySnapshot.docs.map((doc) => {
    return {
      uid: doc.id,
      ...doc.data()
    };
  });

  return members;
}