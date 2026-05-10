import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export async function getOrganizations() {
  const organizationsRef = collection(db, "organizations");
  const querySnapshot = await getDocs(organizationsRef);

  const organizations = querySnapshot.docs.map((doc) => {
    return {
      id: doc.id,
      ...doc.data()
    };
  });

  return organizations;
}