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

function NaverMap({
  restaurants,
  choiceRanking = [],
  highlightedRestaurants = [],
  onHighlightedRestaurantSelect,
  previewPlace,
  onMapBoundsChange,
  onMapCenterChange
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const infoWindowTimerRef = useRef(null);
  const previewMarkerRef = useRef(null);
  const highlightedMarkersRef = useRef([]);


  const [mapReady, setMapReady] = useState(false);
  const [locationError, setLocationError] = useState("");

  const currentLocationMarkerRef = useRef(null);

  function sendMapCenterToApp() {
  if (!mapRef.current || !onMapCenterChange) {
    return;
  }

  const center = mapRef.current.getCenter();



  onMapCenterChange({
    lat: center.lat(),
    lng: center.lng()
  });

}

function sendMapBoundsToApp() {
    if (!mapRef.current || !onMapBoundsChange) {
      return;
    }

    const bounds = mapRef.current.getBounds();
    const sw = bounds.getSW();
    const ne = bounds.getNE();

    onMapBoundsChange({
      south: sw.lat(),
      west: sw.lng(),
      north: ne.lat(),
      east: ne.lng()
    });
  }

  function closeInfoWindow() {
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
      infoWindowRef.current = null;
    }

    if (infoWindowTimerRef.current) {
      clearTimeout(infoWindowTimerRef.current);
      infoWindowTimerRef.current = null;
    }
  }

  function showCurrentLocationMarker(naver, map, position) {
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setMap(null);
      currentLocationMarkerRef.current = null;
    }

    currentLocationMarkerRef.current = new naver.maps.Marker({
      position,
      map,
      title: "내 위치",
      icon: {
        content: `
          <div style="
            width:12px;
            height:12px;
            border-radius:50%;
            background:#126ff4;
            border:4px solid white;
            box-shadow:
              0 0 0 8px rgba(18,111,244,0.18),
              0 2px 8px rgba(0,0,0,0.35);
          "></div>
        `,
        size: new naver.maps.Size(34, 34),
        anchor: new naver.maps.Point(17, 17)
      }
    });
  }

  function moveToCurrentLocationMarker() {
    if (!mapRef.current || !currentLocationMarkerRef.current) {
      alert("현재 위치가 아직 설정되지 않았습니다.");
      return;
    }

    const currentPosition = currentLocationMarkerRef.current.getPosition();

    mapRef.current.setCenter(currentPosition);
    mapRef.current.setZoom(17);

    if (onMapCenterChange) {
      onMapCenterChange({
        lat: currentPosition.lat(),
        lng: currentPosition.lng()
      });
    }

    sendMapBoundsToApp();
  }

  useEffect(() => {
  if (!mapRef.current || !window.naver?.maps) {
    return;
  }

  const naver = window.naver;
  const map = mapRef.current;

  if (previewMarkerRef.current) {
    previewMarkerRef.current.setMap(null);
    previewMarkerRef.current = null;
  }

  if (!previewPlace) {
    return;
  }

  const lat = Number(previewPlace.lat);
  const lng = Number(previewPlace.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return;
  }

  const position = new naver.maps.LatLng(lat, lng);

  previewMarkerRef.current = new naver.maps.Marker({
    position,
    map,
    title: previewPlace.title || previewPlace.name || "선택한 장소"
  });

  map.setCenter(position);
  map.setZoom(17);
}, [previewPlace]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;

    if (!clientId) {
      console.error("네이버 지도 Client ID가 없습니다.");
      return;
    }

    async function initializeMap() {
      try {
        const naver = await loadNaverMapScript(clientId);


       const defaultPosition = {
      lat: 37.5045,
      lng: 127.0250
    };

    let startPosition = defaultPosition;
    let hasCurrentLocation = false;

    try {
      startPosition = await getCurrentPosition();
      hasCurrentLocation = true;
    } catch (error) {
      console.warn(
        "현재 위치를 가져오지 못해 기본 위치로 지도를 표시합니다.",
        error
      );
    }

    const startLatLng = new naver.maps.LatLng(
      startPosition.lat,
      startPosition.lng
    );

    const mapOptions = {
      center: startLatLng,
      zoom: 17
    };

    mapRef.current = new naver.maps.Map(
      mapContainerRef.current,
      mapOptions
    );

    if (hasCurrentLocation) {
      showCurrentLocationMarker(naver, mapRef.current, startLatLng);
    }

        naver.maps.Event.addListener(mapRef.current, "click", () => {
          closeInfoWindow();
        });

        sendMapCenterToApp();
        sendMapBoundsToApp();

       naver.maps.Event.addListener(mapRef.current, "idle", () => {
          sendMapCenterToApp();
          sendMapBoundsToApp();
        });


        // currentLocationMarkerRef.current = new naver.maps.Marker({
        //   position: currentLatLng,
        //   map: mapRef.current,
        //   title: "현재 위치"
        // });

        setMapReady(true);
      } catch (error) {
        console.error("네이버 지도 로딩 실패:", error);
        setLocationError("지도를 불러올 수 없습니다.");
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

  highlightedMarkersRef.current.forEach((marker) => {
    marker.setMap(null);
  });
  highlightedMarkersRef.current = [];

  highlightedRestaurants.forEach((restaurant) => {
    const lat = Number(restaurant.lat);
    const lng = Number(restaurant.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return;
    }

    const position = new naver.maps.LatLng(lat, lng);

    const marker = new naver.maps.Marker({
      position,
      map,
      title: restaurant.name,
      icon: {
        content: `
          <div style="
            width:18px;
            height:18px;
            border-radius:50%;
            background:#e53935;
            border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
            cursor:pointer;
          "></div>
        `,
        size: new naver.maps.Size(24, 24),
        anchor: new naver.maps.Point(12, 12)
      }
    });

    const infoWindowId = `highlight-info-${restaurant.id}`;

    const infoWindow = new naver.maps.InfoWindow({
      content: `
        <div
          id="${infoWindowId}"
          style="
            padding:10px 12px;
            font-size:13px;
            cursor:pointer;
            min-width:140px;
            line-height:1.5;
          "
        >
          <strong>${restaurant.name}</strong>
          <br />
          <span style="color:#666;">눌러서 정보보기</span>
        </div>
      `
    });

    naver.maps.Event.addListener(marker, "click", () => {
      closeInfoWindow();

      infoWindow.open(map, marker);
      infoWindowRef.current = infoWindow;

      setTimeout(() => {
        const element = document.getElementById(infoWindowId);

        if (element) {
          element.onclick = () => {
            closeInfoWindow();

            if (onHighlightedRestaurantSelect) {
              onHighlightedRestaurantSelect(restaurant);
            }
          };
        }
      }, 0);

      infoWindowTimerRef.current = setTimeout(() => {
        closeInfoWindow();
      }, 5000);
    });

    highlightedMarkersRef.current.push(marker);
  });
}, [
  highlightedRestaurants,
  mapReady,
  onHighlightedRestaurantSelect
]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.naver?.maps) {
    return;
  }

    const naver = window.naver;
    const map = mapRef.current;

    closeInfoWindow();

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
        closeInfoWindow();

        infoWindow.open(map, marker);
        infoWindowRef.current = infoWindow;

        infoWindowTimerRef.current = setTimeout(() => {
          closeInfoWindow();
        }, 5000);
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
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "700px",
        height: "400px",
        margin: "20px auto",
        border: "1px solid #ddd"
      }}
    >
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "100%"
        }}
      />

      <button
        type="button"
        onClick={moveToCurrentLocationMarker}
        title="내 위치로 이동"
        style={{
          position: "absolute",
          right: "16px",
          bottom: "16px",
          zIndex: 10,
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          border: "1px solid #d9e0ea",
          background: "white",
          boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          cursor: "pointer",
          fontSize: "20px"
        }}
      >
        ⦿
      </button>
    </div>
  );
}

export default NaverMap;