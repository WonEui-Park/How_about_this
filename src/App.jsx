import NaverMap from "./components/NaverMap";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { signUpUser, loginUser } from "./authService";
import { getUserProfile, updateUserProfile  } from "./userService";
import { selectRestaurant, getMyChoiceByDate, cancelUserChoice } from "./choiceService";
import { getRestaurants, addRestaurant, updateRestaurant } from "./restaurantService";
import { getTodayString } from "./utils/dateUtils";
import { getChoiceStatusByDateAndAffiliation } from "./statusService";
import { getOrganizations } from "./organizationService";
import { getTeamMembers } from "./teamService";
import { searchNaverPlaces } from "./placeService";
import "./App.css";

function App() {
  const [pbnum, setPbnum] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [restaurants, setRestaurants] = useState([]);
  const [myChoice, setMyChoice] = useState(null);

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [choiceStatus, setChoiceStatus] = useState({
    ranking: [],
    recommendations: []
  });

  const [editAffiliation, setEditAffiliation] = useState("");
  const [editTeamName, setEditTeamName] = useState("");
  const [editRole, setEditRole] = useState("member");

  const [organizations, setOrganizations] = useState([]);

  const [selectWithTeam, setSelectWithTeam] = useState(false);

  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [newRestaurantMenu, setNewRestaurantMenu] = useState("");

  const [showOnBoard, setShowOnBoard] = useState(false);
  const [recommendationReason, setRecommendationReason] = useState("");

  const [pendingRestaurant, setPendingRestaurant] = useState(null);

  const [restaurantSearchKeyword, setRestaurantSearchKeyword] = useState("");
  const [editingRestaurantId, setEditingRestaurantId] = useState(null);
  const [editRestaurantName, setEditRestaurantName] = useState("");
  const [editRestaurantMenu, setEditRestaurantMenu] = useState("");

  const [placeSearchResults, setPlaceSearchResults] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);

  const [mapCenter, setMapCenter] = useState(null);

  async function handleUpdateProfile() {
  try {
    setMessage("");

    await updateUserProfile(profile.uid, {
      affiliation: editAffiliation,
      teamName: editTeamName,
      role: editRole
    });

    const updatedProfile = await getUserProfile(profile.uid);
    setProfile(updatedProfile);

    setMessage("내 정보가 저장되었습니다.");
  } catch (error) {
    console.error(error);
    setMessage("내 정보 저장 실패: " + error.message);
  }
}

function handleSelectRestaurant(restaurant) {
  setPendingRestaurant(restaurant);
  setShowOnBoard(false);
  setRecommendationReason("");
  setMessage("");
}


async function handleConfirmSelectRestaurant() {
  try {
    setMessage("");

    if (!pendingRestaurant) {
      setMessage("선택된 식당이 없습니다.");
      return;
    }

    // 조장이 체크박스를 켠 경우: 같은 소속 + 같은 팀 전체 선택
    if (profile.role === "leader" && selectWithTeam) {
      const members = await getTeamMembers(
        profile.affiliation,
        profile.teamName
      );

      await Promise.all(
        members.map((member) =>
          selectRestaurant({
            userProfile: profile,
            restaurant: pendingRestaurant,
            selectedDate,
            targetUser: member,
            overriddenBy: member.uid === profile.uid ? null : profile.uid,

            // 조장 본인만 현황판 공개 가능
            isPublicRecommendation:
              member.uid === profile.uid ? showOnBoard : false,
            recommendationReason:
              member.uid === profile.uid ? recommendationReason : ""
          })
        )
      );

      const choice = await getMyChoiceByDate(profile.uid, selectedDate);
      setMyChoice(choice);

      const status = await getChoiceStatusByDateAndAffiliation(
        selectedDate,
        profile.affiliation
      );
      setChoiceStatus(status);

      setMessage(
        `${selectedDate} 날짜에 ${profile.teamName} 팀 전체가 ${pendingRestaurant.name} 선택 완료`
      );

      setPendingRestaurant(null);
      setShowOnBoard(false);
      setRecommendationReason("");

      return;
    }

    // 일반 선택: 본인만 선택
    const savedChoice = await selectRestaurant({
      userProfile: profile,
      restaurant: pendingRestaurant,
      selectedDate,
      isPublicRecommendation: showOnBoard,
      recommendationReason
    });

    const choice = await getMyChoiceByDate(profile.uid, selectedDate);
    setMyChoice(choice);

    const status = await getChoiceStatusByDateAndAffiliation(
      selectedDate,
      profile.affiliation
    );
    setChoiceStatus(status);

    setMessage(`${savedChoice.date} 날짜에 ${savedChoice.restaurantName} 선택 완료`);

    setPendingRestaurant(null);
    setShowOnBoard(false);
    setRecommendationReason("");
  } catch (error) {
    console.error(error);
    setMessage("식당 선택 실패: " + error.message);
  }
}

function handleCancelPendingRestaurant() {
  setPendingRestaurant(null);
  setShowOnBoard(false);
  setRecommendationReason("");
}

async function handleAddRestaurant() {
  try {
    setMessage("");

    if (!selectedPlace) {
      setMessage("검색 결과에서 등록할 장소를 선택해주세요.");
      return;
    }

    const addressForGeocode =
      selectedPlace.roadAddress || selectedPlace.address;

    if (!addressForGeocode) {
      setMessage("선택한 장소에 주소 정보가 없습니다.");
      return;
    }

    const addressForKey =
      selectedPlace.roadAddress || selectedPlace.address || "";


    await addRestaurant({
      name: selectedPlace.title,
      menu: newRestaurantMenu,
      address: selectedPlace.address,
      roadAddress: selectedPlace.roadAddress,
      lat: Number(selectedPlace.lat),
      lng: Number(selectedPlace.lng),
      mapProvider: "naver",
      placeKey: `naver_${selectedPlace.title}_${addressForGeocode}`,
      createdBy: profile.name
    });

    const restaurantList = await getRestaurants();
    setRestaurants(restaurantList);

    setNewRestaurantName("");
    setNewRestaurantMenu("");
    setPlaceSearchResults([]);
    setSelectedPlace(null);

    setMessage("식당이 추가되었습니다.");
  } catch (error) {
    console.error(error);
    setMessage("식당 추가 실패: " + error.message);
  }
}

async function handleCancelChoice() {
  try {
    setMessage("");

    // 조장이 체크박스를 켠 경우: 같은 팀 전체 선택 취소
    if (profile.role === "leader" && selectWithTeam) {
      const members = await getTeamMembers(
        profile.affiliation,
        profile.teamName
      );

      await Promise.all(
        members.map((member) =>
          cancelUserChoice(member.uid, selectedDate)
        )
      );

      setMyChoice(null);

      const status = await getChoiceStatusByDateAndAffiliation(
        selectedDate,
        profile.affiliation
      );
      setChoiceStatus(status);

      setShowOnBoard(false);
      setRecommendationReason("");

      setMessage(`${selectedDate} 날짜의 ${profile.teamName} 팀 전체 식당 선택을 취소했습니다.`);
      return;
    }

    // 일반 사용자 또는 체크박스 OFF 상태: 본인 선택만 취소
    await cancelUserChoice(profile.uid, selectedDate);

    setMyChoice(null);

    const status = await getChoiceStatusByDateAndAffiliation(
      selectedDate,
      profile.affiliation
    );
    setChoiceStatus(status);

    setMessage(`${selectedDate} 날짜의 식당 선택을 취소했습니다.`);
  } catch (error) {
    console.error(error);
    setMessage("식당 선택 취소 실패: " + error.message);
  }
}



async function handleSearchPlace() {
  try {
    console.log("장소 검색 버튼 클릭됨");
    console.log("현재 mapCenter:", mapCenter);

    setMessage("");
    setPlaceSearchLoading(true);
    setSelectedPlace(null);

    if (!newRestaurantName.trim()) {
      setMessage("검색할 가게 이름을 입력해주세요.");
      return;
    }

    if (!mapCenter) {
      setMessage("지도가 아직 준비되지 않았습니다. 잠시 후 다시 검색해주세요.");
      return;
    }

    const results = await searchNaverPlaces(
      newRestaurantName,
      mapCenter
    );

    setPlaceSearchResults(results);

    if (results.length === 0) {
      setMessage("검색 결과가 없습니다.");
    }
  } catch (error) {
    console.error(error);
    setMessage("장소 검색 실패: " + error.message);
  } finally {
    setPlaceSearchLoading(false);
  }
}



  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUser(user);

          const userProfile = await getUserProfile(user.uid);
          setProfile(userProfile);

          setEditAffiliation(userProfile.affiliation || "");
          setEditTeamName(userProfile.teamName || "");
          setEditRole(userProfile.role || "member");



          const restaurantList = await getRestaurants();
          setRestaurants(restaurantList);

          const organizationList = await getOrganizations();
          setOrganizations(organizationList);

          const choice = await getMyChoiceByDate(user.uid, selectedDate);
          setMyChoice(choice);

          const status = await getChoiceStatusByDateAndAffiliation(
            selectedDate,
            userProfile.affiliation

          );
          setChoiceStatus(status);

        } else {
          setCurrentUser(null);
          setProfile(null);
          setRestaurants([]);
          setMyChoice(null);
          setChoiceStatus({
            ranking: [],
            recommendations: []
          });
          setOrganizations([]);

          setEditAffiliation("");
          setEditTeamName("");
          setEditRole("member");


        }
      } catch (error) {
        console.error(error);
        setMessage("사용자 정보 불러오기 실패: " + error.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function handleSignUp() {
    try {
      setMessage("");

      await signUpUser({ pbnum, name, password });

      setMessage("회원가입 성공");
    } catch (error) {
      console.error(error);
      setMessage("회원가입 실패: " + error.message);
    }
  }

  async function handleLogin() {
    try {
      setMessage("");

      await loginUser({ pbnum, name, password });

      setMessage("로그인 성공");
    } catch (error) {
      console.error(error);
      setMessage("로그인 실패: " + error.message);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      setMessage("로그아웃 완료");
    } catch (error) {
      console.error(error);
      setMessage("로그아웃 실패: " + error.message);
    }
  }
async function handleUpdateRestaurant() {
  try {
    setMessage("");

    await updateRestaurant(editingRestaurantId, {
      name: editRestaurantName,
      menu: editRestaurantMenu
    });

    const restaurantList = await getRestaurants();
    setRestaurants(restaurantList);

    setEditingRestaurantId(null);
    setEditRestaurantName("");
    setEditRestaurantMenu("");

    setMessage("식당 정보가 수정되었습니다.");
  } catch (error) {
    console.error(error);
    setMessage("식당 수정 실패: " + error.message);
  }
}



  function handleStartEditRestaurant(restaurant) {
  setEditingRestaurantId(restaurant.id);
  setEditRestaurantName(restaurant.name || "");
  setEditRestaurantMenu(restaurant.menu || "");
  setMessage("");
}

function handleCancelEditRestaurant() {
  setEditingRestaurantId(null);
  setEditRestaurantName("");
  setEditRestaurantMenu("");
}



  if (loading) {
    return <div style={{ padding: "40px" }}>로딩 중...</div>;
  }

const selectedOrganization = organizations.find(
    (org) => org.name === editAffiliation
);

const teamOptions = selectedOrganization?.teams || [];

const filteredRestaurants = restaurants
  .filter((restaurant) => {
    const keyword = restaurantSearchKeyword.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    const restaurantName = (restaurant.name || "").toLowerCase();
    const restaurantMenu = (restaurant.menu || "").toLowerCase();

    return (
      restaurantName.includes(keyword) ||
      restaurantMenu.includes(keyword)
    );
  })
  .sort((a, b) => {
    return (a.name || "").localeCompare(b.name || "", "ko");
  });



  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>이건 어때</h1>

      {currentUser && profile ? (
        <div>
          <h2>로그인된 화면</h2>

          <p>이름: {profile.name}</p>
          <p>PB 번호: {profile.pbnum}</p>
          <p>소속: {profile.affiliation || "미설정"}</p>
          <p>팀명: {profile.teamName || "미설정"}</p>
          <p>계급: {profile.role === "leader" ? "조장" : "조원"}</p>

        <hr />

<h2>내 정보 수정</h2>

<div>
  <input
    list="organization-list"
    placeholder="소속"
    value={editAffiliation}
    onChange={(e) => {
      setEditAffiliation(e.target.value);
      setEditTeamName("");
    }}
  />

  <datalist id="organization-list">
  {editAffiliation.trim() !== "" &&
    organizations
      .filter((org) =>
        org.name.toLowerCase().includes(editAffiliation.toLowerCase())
      )
      .map((org) => (
        <option key={org.id} value={org.name} />
      ))}
</datalist>
</div>

<div>
  <select
    value={editTeamName}
    onChange={(e) => setEditTeamName(e.target.value)}
    disabled={!selectedOrganization}
  >
    <option value="">팀 선택</option>

    {teamOptions.map((team) => (
      <option key={team} value={team}>
        {team}
      </option>
    ))}
  </select>
</div>

<div>
  <select
    value={editRole}
    onChange={(e) => setEditRole(e.target.value)}
  >
    <option value="member">조원</option>
    <option value="leader">조장</option>
  </select>
</div>

<button onClick={handleUpdateProfile}>내 정보 저장</button>

<hr />


          <h2>{selectedDate}에 선택한 식당</h2>

{myChoice ? (
  <div>
    <p>
      <strong>{myChoice.restaurantName}</strong> 선택됨
    </p>

    <button onClick={handleCancelChoice}>
      선택 취소
    </button>
  </div>
) : (
  <p>아직 선택한 식당이 없습니다.</p>
)}

<input
  type="date"
  value={selectedDate}
  onChange={async (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);

    if (profile) {
      const choice = await getMyChoiceByDate(profile.uid, newDate);
      setMyChoice(choice);

      const status = await getChoiceStatusByDateAndAffiliation(
       newDate,
       profile.affiliation
      );
      setChoiceStatus(status);
    }
  }}
/>

<h2>{selectedDate} 현황판</h2>

<h3>공개 추천</h3>

{choiceStatus.recommendations.length === 0 ? (
  <p>아직 공개 추천이 없습니다.</p>
) : (
  <ul>
    {choiceStatus.recommendations.map((item) => (
      <li key={item.id} style={{ marginBottom: "16px" }}>
        <strong>{item.userName}</strong>님이{" "}
        <strong>{item.restaurantName}</strong>을 선택했습니다.
        {item.recommendationReason && (
          <>
            <br />
            추천 이유: {item.recommendationReason}
          </>
        )}
      </li>
    ))}
  </ul>
)}

<h3>선택 인원 순위</h3>

{choiceStatus.ranking.length === 0 ? (
  <p>아직 선택한 사람이 없습니다.</p>
) : (
  <ul>
    {choiceStatus.ranking.map((status) => (
      <li key={status.restaurantId} style={{ marginBottom: "16px" }}>
        <strong>{status.restaurantName}</strong>: {status.count}명
        <br />
        선택자:{" "}
        {status.users.map((user) => user.userName).join(", ")}
      </li>
    ))}
  </ul>
)}

{profile.role === "leader" && (
  <div style={{ marginTop: "20px", marginBottom: "20px" }}>
    <label>
      <input
        type="checkbox"
        checked={selectWithTeam}
        onChange={(e) => setSelectWithTeam(e.target.checked)}
      />
      {" "}팀원도 같이 적용
    </label>
  </div>
)}

<hr />

<h2>식당 제안</h2>

<div>
  <input
    placeholder="가게 이름 검색"
    value={newRestaurantName}
    onChange={(e) => {
      setNewRestaurantName(e.target.value);
      setSelectedPlace(null);
      setPlaceSearchResults([]);
    }}
  />

  <button onClick={handleSearchPlace} disabled={placeSearchLoading}>
    {placeSearchLoading ? "검색 중..." : "장소 검색"}
  </button>
</div>

{placeSearchResults.length > 0 && (
  <ul>
    {placeSearchResults.map((place, index) => (
      <li key={`${place.title}-${index}`} style={{ marginBottom: "12px" }}>
        <strong>{place.title}</strong>
        <br />
        {place.category && <>분류: {place.category}<br /></>}

        <button
          onClick={() => {
            setSelectedPlace(place);
            setNewRestaurantName(place.title);
          }}
        >
          이 장소 선택
        </button>
      </li>
    ))}
  </ul>
)}

{selectedPlace && (
  <p>
    선택된 장소: <strong>{selectedPlace.title}</strong>
    <br />
    {selectedPlace.roadAddress || selectedPlace.address}
  </p>
)}

<div>
  <input
    placeholder="추천 메뉴"
    value={newRestaurantMenu}
    onChange={(e) => setNewRestaurantMenu(e.target.value)}
  />
</div>

<button onClick={handleAddRestaurant}>
  식당 추가
</button>

{/* <h2>현황판 공개 설정</h2>

<label>
  <input
    type="checkbox"
    checked={showOnBoard}
    onChange={(e) => {
      setShowOnBoard(e.target.checked);

      if (!e.target.checked) {
        setRecommendationReason("");
      }
    }}
  />
  {" "}내 선택을 같은 소속 현황판에 공개
</label>

{showOnBoard && (
  <div style={{ marginTop: "10px" }}>
    <textarea
      placeholder="추천 이유를 입력하세요. 예: 가까워서, 가격이 좋아서, 메뉴가 무난해서"
      value={recommendationReason}
      onChange={(e) => setRecommendationReason(e.target.value)}
      rows={3}
      style={{ width: "300px" }}
    />
  </div>
)} */}

{pendingRestaurant && (
  <div
    style={{
      border: "1px solid #ccc",
      padding: "16px",
      margin: "20px auto",
      maxWidth: "400px"
    }}
  >
    <h2>식당 선택 확인</h2>

    <p>
      <strong>{pendingRestaurant.name}</strong>을/를{" "}
      <strong>{selectedDate}</strong> 날짜에 선택하시겠습니까?
    </p>

    {profile.role === "leader" && selectWithTeam && (
      <p>
        현재 <strong>팀원도 같이 적용</strong>이 체크되어 있어,
        같은 팀원들의 선택도 함께 변경됩니다.
      </p>
    )}

    <label>
      <input
        type="checkbox"
        checked={showOnBoard}
        onChange={(e) => {
          setShowOnBoard(e.target.checked);

          if (!e.target.checked) {
            setRecommendationReason("");
          }
        }}
      />
      {" "}내 선택을 같은 소속 현황판에 공개
    </label>

    {showOnBoard && (
      <div style={{ marginTop: "10px" }}>
        <textarea
          placeholder="추천 이유를 입력하세요. 예: 가까워서, 가격이 좋아서, 메뉴가 무난해서"
          value={recommendationReason}
          onChange={(e) => setRecommendationReason(e.target.value)}
          rows={3}
          style={{ width: "100%" }}
        />
      </div>
    )}

    <div style={{ marginTop: "12px" }}>
      <button onClick={handleConfirmSelectRestaurant}>
        확인
      </button>

      <button
        onClick={handleCancelPendingRestaurant}
        style={{ marginLeft: "8px" }}
      >
        취소
      </button>
    </div>
  </div>
)}

<h2>지도</h2>
<NaverMap
  restaurants={restaurants}
  choiceRanking={choiceStatus.ranking}
  onMapCenterChange={setMapCenter}
/>



<h2>식당 목록</h2>

<div style={{ marginBottom: "16px" }}>
  <input
    placeholder="식당 이름 또는 추천 메뉴 검색"
    value={restaurantSearchKeyword}
    onChange={(e) => setRestaurantSearchKeyword(e.target.value)}
  />
</div>

{restaurants.length === 0 ? (
  <p>등록된 식당이 없습니다.</p>
) : filteredRestaurants.length === 0 ? (
  <p>검색 결과가 없습니다.</p>
) : (
  <ul>
    {filteredRestaurants.map((restaurant) => (
      <li key={restaurant.id} style={{ marginBottom: "20px" }}>
        {editingRestaurantId === restaurant.id ? (
          <div>
            <input
              placeholder="식당 이름"
              value={editRestaurantName}
              onChange={(e) => setEditRestaurantName(e.target.value)}
            />
            <br />

            <input
              placeholder="추천 메뉴"
              value={editRestaurantMenu}
              onChange={(e) => setEditRestaurantMenu(e.target.value)}
            />
            <br />

            <button onClick={handleUpdateRestaurant}>
              저장
            </button>

            <button
              onClick={handleCancelEditRestaurant}
              style={{ marginLeft: "8px" }}
            >
              취소
            </button>
          </div>
        ) : (
          <div>
            <strong>{restaurant.name}</strong>
            <br />
            {restaurant.menu && restaurant.menu.trim() !== "" && (
              <>
                추천 메뉴: {restaurant.menu}
                <br />
              </>
            )}
            <br />

            <button onClick={() => handleSelectRestaurant(restaurant)}>
              선택
            </button>

            <button
              onClick={() => handleStartEditRestaurant(restaurant)}
              style={{ marginLeft: "8px" }}
            >
              수정
            </button>
          </div>
        )}
      </li>
    ))}
  </ul>
)}

          <button onClick={handleLogout}>로그아웃</button>
        </div>
      ) : (
        <div>
          <h2>로그인 / 회원가입</h2>

          <div>
            <input
              placeholder="PB 번호"
              value={pbnum}
              onChange={(e) => setPbnum(e.target.value)}
            />
          </div>

          <div>
            <input
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button onClick={handleSignUp}>회원가입</button>
          <button onClick={handleLogin}>로그인</button>
        </div>
      )}

      <p>{message}</p>
    </div>
  );
}

export default App;