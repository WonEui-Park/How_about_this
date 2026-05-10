const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const NAVER_SEARCH_CLIENT_ID = defineSecret("NAVER_SEARCH_CLIENT_ID");
const NAVER_SEARCH_CLIENT_SECRET = defineSecret("NAVER_SEARCH_CLIENT_SECRET");

function removeHtmlTags(text) {
  if (!text) {
    return "";
  }

  return text.replace(/<[^>]*>/g, "");
}

function convertNaverMapPointToLatLng(mapx, mapy) {
  const lng = Number(mapx) / 10000000;
  const lat = Number(mapy) / 10000000;

  return { lat, lng };
}

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) *
      Math.cos(rLat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

exports.searchNaverPlaces = onCall(
  {
    region: "asia-northeast3",
    secrets: [NAVER_SEARCH_CLIENT_ID, NAVER_SEARCH_CLIENT_SECRET],
    cors: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://how-about-this-aa161.web.app"
    ]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const keyword = String(request.data.keyword || "").trim();

    const currentLat = Number(request.data.currentLat);
    const currentLng = Number(request.data.currentLng);

    if (!keyword) {
      throw new HttpsError("invalid-argument", "검색어가 없습니다.");
    }

    if (Number.isNaN(currentLat) || Number.isNaN(currentLng)) {
      throw new HttpsError("invalid-argument", "검색 기준 위치가 없습니다.");
    }

    const url =
      "https://openapi.naver.com/v1/search/local.json" +
      `?query=${encodeURIComponent(keyword)}` +
      "&display=5" +
      "&start=1" +
      "&sort=random";

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Naver-Client-Id": NAVER_SEARCH_CLIENT_ID.value(),
        "X-Naver-Client-Secret": NAVER_SEARCH_CLIENT_SECRET.value()
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Naver Local Search Error:", response.status, errorText);

      throw new HttpsError(
        "internal",
        "네이버 지역 검색 API 호출에 실패했습니다."
      );
    }

    const data = await response.json();

    const items = (data.items || [])
      .map((item) => {
        const title = removeHtmlTags(item.title);
        const category = removeHtmlTags(item.category);

        const { lat, lng } = convertNaverMapPointToLatLng(
          item.mapx,
          item.mapy
        );

        const distanceKm = calculateDistanceKm(
          currentLat,
          currentLng,
          lat,
          lng
        );

        return {
          title,
          category,
          address: item.address || "",
          roadAddress: item.roadAddress || "",
          link: item.link || "",
          telephone: item.telephone || "",
          mapx: item.mapx || "",
          mapy: item.mapy || "",
          lat,
          lng,
          distanceKm
        };
      })
      .filter((item) => {
        item.category.includes("음식점") &&
        !Number.isNaN(item.lat) &&
        !Number.isNaN(item.lng)
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);

    return {
      items
    };
  }
);