import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

export async function getChoiceStatusByDateAndAffiliation(selectedDate, affiliation) {
  if (!selectedDate || !affiliation) {
    return {
      ranking: [],
      recommendations: []
    };
  }

  const choicesRef = collection(db, "dailyChoices");

  const q = query(
    choicesRef,
    where("date", "==", selectedDate),
    where("affiliation", "==", affiliation)
  );

  const querySnapshot = await getDocs(q);

  const choices = querySnapshot.docs.map((doc) => {
    return {
      id: doc.id,
      ...doc.data()
    };
  });

  const statusMap = {};

  choices.forEach((choice) => {
    const restaurantId = choice.restaurantId;

    if (!statusMap[restaurantId]) {
      statusMap[restaurantId] = {
        restaurantId: choice.restaurantId,
        restaurantName: choice.restaurantName,
        count: 0,
        users: []
      };
    }

    statusMap[restaurantId].count += 1;

    statusMap[restaurantId].users.push({
      userId: choice.userId,
      userName: choice.userName,
      teamName: choice.teamName || "",
      role: choice.role || "member"
    });
  });

  const recommendations = choices
    .filter((choice) => choice.isPublicRecommendation)
    .map((choice) => ({
      id: choice.id,
      userName: choice.userName,
      restaurantName: choice.restaurantName,
      recommendationReason: choice.recommendationReason || "",
      teamName: choice.teamName || "",
      updatedAt: choice.updatedAt || null
    }));

  return {
    ranking: Object.values(statusMap).sort((a, b) => b.count - a.count),
    recommendations
  };
}