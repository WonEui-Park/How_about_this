import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
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

export async function addRestaurant({
  name,
  menu,
  address = "",
  roadAddress = "",
  lat = null,
  lng = null,
  mapProvider = "",
  placeKey = "",
  createdBy
}) {
  if (!name.trim()) {
    throw new Error("식당 이름을 입력해주세요.");
  }

   if (!placeKey) {
    throw new Error("장소 정보가 없습니다. 검색 결과에서 장소를 선택해주세요.");
  }

  const restaurantsRef = collection(db, "restaurants");

  const duplicateQuery = query(
    restaurantsRef,
    where("placeKey", "==", placeKey)
  );

  const duplicateSnapshot = await getDocs(duplicateQuery);

  if (!duplicateSnapshot.empty) {
    throw new Error("이미 등록된 식당입니다.");
  }


  await addDoc(restaurantsRef, {
    name: name.trim(),
    menu: menu.trim(),
    address,
    roadAddress,
    lat,
    lng,
    mapProvider,
    placeKey,
    createdBy,
    createdAt: serverTimestamp()
  });
}

export async function updateRestaurant(restaurantId, data) {
  if (!restaurantId) {
    throw new Error("수정할 식당 정보가 없습니다.");
  }

  if (!data.name.trim()) {
    throw new Error("식당 이름을 입력해주세요.");
  }

  const restaurantRef = doc(db, "restaurants", restaurantId);

  await updateDoc(restaurantRef, {
    name: data.name.trim(),
    menu: data.menu.trim(),
    updatedAt: serverTimestamp()
  });
}