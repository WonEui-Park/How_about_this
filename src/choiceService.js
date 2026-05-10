import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function selectRestaurant({
  userProfile,
  restaurant,
  selectedDate,
  targetUser = null,
  overriddenBy = null,
  isPublicRecommendation = false,
  recommendationReason = ""

}) {
  if (!selectedDate) {
    throw new Error("선택 날짜가 없습니다.");
  }

  const choiceUser = targetUser || userProfile;

  const choiceId = `${selectedDate}_${choiceUser.uid}`;
  const choiceRef = doc(db, "dailyChoices", choiceId);

  await setDoc(choiceRef, {
    date: selectedDate,

    userId: choiceUser.uid,
    userName: choiceUser.name,
    affiliation: choiceUser.affiliation || "",
    teamName: choiceUser.teamName || "",
    role: choiceUser.role || "member",

    restaurantId: restaurant.id,
    restaurantName: restaurant.name,

    selectedBy: userProfile.uid,
    overriddenBy: overriddenBy,

    isPublicRecommendation,
    recommendationReason: isPublicRecommendation
      ? recommendationReason.trim()
      : "",

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


export async function cancelUserChoice(uid, selectedDate) {
  if (!uid || !selectedDate) {
    throw new Error("사용자 정보 또는 날짜가 없습니다.");
  }

  const choiceId = `${selectedDate}_${uid}`;
  const choiceRef = doc(db, "dailyChoices", choiceId);

  await deleteDoc(choiceRef);
}
