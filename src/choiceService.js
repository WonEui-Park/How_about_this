import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";



export async function selectRestaurant({ userProfile, restaurant, selectedDate }) {
 

  // 하루에 한 사람당 하나의 문서만 생기도록 문서 ID를 고정
  const choiceId = `${selectedDate}_${userProfile.uid}`;
  const choiceRef = doc(db, "dailyChoices", choiceId);

  await setDoc(choiceRef, {
    date: selectedDate,

    userId: userProfile.uid,
    userName: userProfile.name,
    affiliation: userProfile.affiliation || "",
    teamName: userProfile.teamName || "",
    role: userProfile.role || "member",

    restaurantId: restaurant.id,
    restaurantName: restaurant.name,

    selectedBy: userProfile.uid,
    overriddenBy: null,

    updatedAt: serverTimestamp()
  });

  return {
    date: selectedDate,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name
  };
}

export async function getMyChoiceByDate(uid, selectedDate) {
  if (!selectedDate) {
    return null;
  }
  
  
  const choiceId = `${selectedDate}_${uid}`;
  const choiceRef = doc(db, "dailyChoices", choiceId);

  const choiceSnap = await getDoc(choiceRef);

  if (!choiceSnap.exists()) {
    return null;
  }

  return {
    id: choiceSnap.id,
    ...choiceSnap.data()
  };
}