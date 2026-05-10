import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export async function searchNaverPlaces(keyword, currentPosition) {
  const searchPlaces = httpsCallable(functions, "searchNaverPlaces");

  const result = await searchPlaces({
    keyword,
    currentLat: currentPosition.lat,
    currentLng: currentPosition.lng
  });

  return result.data.items || [];
}