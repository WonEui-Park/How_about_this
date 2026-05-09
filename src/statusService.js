import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

export async function getChoiceStatusByDate(selectedDate) {
  if (!selectedDate) {
    return [];
  }

  const choicesRef = collection(db, "dailyChoices");

  const q = query(
    choicesRef,
    where("date", "==", selectedDate)
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

  return Object.values(statusMap).sort((a, b) => b.count - a.count);
}