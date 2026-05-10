import { useEffect, useRef, useState } from "react";


function loadNaverMapScript(clientId) {
  return new Promise((resolve, reject) => {
    if (window.naver && window.naver.maps) {
      resolve(window.naver);
      return;
    }

    const existingScript = document.querySelector(
      'script[src*="oapi.map.naver.com/openapi/v3/maps.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        resolve(window.naver);
      });
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`;    
    script.async = true;


    script.onload = () => {
      resolve(window.naver);
    };

    script.onerror = reject;

    document.head.appendChild(script);
  });
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저는 위치 정보를 지원하지 않습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
}

function NaverMap({ restaurants, choiceRanking = [], onMapCenterChange }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);


  const [mapReady, setMapReady] = useState(false);
  const [locationError, setLocationError] = useState("");

//   const currentLocationMarkerRef = useRef(null);

  function sendMapCenterToApp() {
  if (!mapRef.current || !onMapCenterChange) {
    return;
  }

  const center = mapRef.current.getCenter();


  console.log("지도 생성 직후 중심:", {
  lat: center.lat(),
  lng: center.lng()
  });

if (onMapCenterChange) {
  onMapCenterChange({
    lat: center.lat(),
    lng: center.lng()
  });
}
}

  useEffect(() => {
    const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;

    if (!clientId) {
      console.error("네이버 지도 Client ID가 없습니다.");
      return;
    }

    async function initializeMap() {
      try {
        const naver = await loadNaverMapScript(clientId);

        const currentPosition = await getCurrentPosition();

        const currentLatLng = new naver.maps.LatLng(
          currentPosition.lat,
          currentPosition.lng
        );

        const mapOptions = {
          center: currentLatLng,
          zoom: 17
        };

        mapRef.current = new naver.maps.Map(
          mapContainerRef.current,
          mapOptions
        );

        sendMapCenterToApp();

        naver.maps.Event.addListener(mapRef.current, "idle", () => {
        const center = mapRef.current.getCenter();

        console.log("지도 이동 후 중심:", {
            lat: center.lat(),
            lng: center.lng()
        });

        if (onMapCenterChange) {
            onMapCenterChange({
            lat: center.lat(),
            lng: center.lng()
            });
        }
        });


        // currentLocationMarkerRef.current = new naver.maps.Marker({
        //   position: currentLatLng,
        //   map: mapRef.current,
        //   title: "현재 위치"
        // });

        setMapReady(true);
      } catch (error) {
        console.error("현재 위치 또는 네이버 지도 로딩 실패:", error);
        setLocationError(
          "현재 위치를 가져올 수 없습니다. 브라우저 위치 권한을 허용해주세요."
        );
      }
    }

    initializeMap();
  }, [onMapCenterChange]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.naver?.maps) {
    return;
  }

    const naver = window.naver;
    const map = mapRef.current;

    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    const restaurantsWithLocation = restaurants.filter((restaurant) => {
        const lat = Number(restaurant.lat);
        const lng = Number(restaurant.lng);

        return !Number.isNaN(lat) && !Number.isNaN(lng);
    });

    

     restaurantsWithLocation.forEach((restaurant) => {
        const rankingItem = choiceRanking.find(
        (item) => item.restaurantId === restaurant.id
        );

        const choiceCount = rankingItem ? rankingItem.count : 0;

        if (choiceCount === 0) {
          return;
        }

        const markerSize = 6 + choiceCount * 8;
        const limitedMarkerSize = Math.min(markerSize, 70);


      const lat = Number(restaurant.lat);
      const lng = Number(restaurant.lng);

      const position = new naver.maps.LatLng(lat, lng);

      
      const marker = new naver.maps.Marker({
        position,
        map,
        icon: {
            content: `
            <div style="
                width:${limitedMarkerSize}px;
                height:${limitedMarkerSize}px;
                border-radius:50%;
                background:#2f80ed;
                color:white;
                display:flex;
                align-items:center;
                justify-content:center;
                font-weight:bold;
                font-size:${choiceCount > 0 ? 16 : 12}px;
                border:2px solid white;
                box-shadow:0 2px 6px rgba(0,0,0,0.3);
            ">
                ${choiceCount > 0 ? choiceCount : ""}
            </div>
            `,
            size: new naver.maps.Size(limitedMarkerSize, limitedMarkerSize),
            anchor: new naver.maps.Point(
            limitedMarkerSize / 2,
            limitedMarkerSize / 2
            )
        }
        });

      const infoWindow = new naver.maps.InfoWindow({
        content: `
          <div style="padding:8px;font-size:13px;">
            <strong>${restaurant.name}</strong><br />
            선택 인원: ${choiceCount}명
          </div>
        `
      });

      naver.maps.Event.addListener(marker, "click", () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });


  }, [restaurants, choiceRanking, mapReady]);

  if (locationError) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "700px",
          height: "400px",
          margin: "20px auto",
          border: "1px solid #ddd",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666"
        }}
        >
        {locationError}
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: "100%",
        maxWidth: "700px",
        height: "400px",
        margin: "20px auto",
        border: "1px solid #ddd"
      }}
    />
  );
}

export default NaverMap;