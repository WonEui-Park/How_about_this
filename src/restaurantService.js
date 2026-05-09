import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export async function getRestaurants() {
  const restaurantsRef = collection(db, "restaurants");
  const querySnapshot = await getDocs(restaurantsRef);

  const restaurants = querySnapshot.docs.map((doc) => {
    return {
      id: doc.id,
      ...doc.data()
    };
  });

  return restaurants;
}