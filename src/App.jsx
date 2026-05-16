import NaverMap from "./components/NaverMap";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { signUpUser, loginUser } from "./authService";
import { getUserProfile, updateUserProfile  } from "./userService";
import { selectRestaurant, getMyChoiceByDate, cancelUserChoice } from "./choiceService";
import { getRestaurants, addRestaurant, updateRestaurant } from "./restaurantService";
import { getTodayString } from "./utils/dateUtils";
import { 
  getChoiceStatusByDateAndAffiliation,
  getChoiceStatusByDate 
} from "./statusService";
import { getOrganizations } from "./organizationService";
import { getTeamMembers } from "./teamService";
import { searchNaverPlaces } from "./placeService";
import "./App.css";


//시작할때 
//npm run build
//firebase deploy --only hosting
//functions 업데이트할때
//firebase deploy --only functions
//서버 닫을때
//firebase hosting:disable






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
  const [publicMapStatus, setPublicMapStatus] = useState({
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
  const [previewPlace, setPreviewPlace] = useState(null);


  
  const [mapCenter, setMapCenter] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);
  const [showMapRestaurants, setShowMapRestaurants] = useState(false);
  const [mapVisibleRestaurants, setMapVisibleRestaurants] = useState([]);

  const [screen, setScreen] = useState("login");
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const [selectedRanking, setSelectedRanking] = useState(null);

  const [signUpLoading, setSignIpLoading] = useState(false);
  const [addRestaurantLoading, setAddRestaurantLoading] = useState(false);

  const signUpLockRef = useRef(false);
  const addRestaurantLockRef = useRef(false);

  const BUTTON_COOLDOWN_MS = 1000;

  function goToMain() {
    setScreen("main");
    setPendingRestaurant(null);
    setSelectedPlace(null);
    setPreviewPlace(null);
    setSelectedRanking(null);
    setPlaceSearchResults([]);
    setRestaurantSearchKeyword("");
    setShowOnBoard(false);
    setRecommendationReason("");
    setShowMapRestaurants(false);
    setMapVisibleRestaurants([]);
  }

  function goToSelectList() {
    setScreen("selectList");
    setPendingRestaurant(null);
    setPreviewPlace(null);
    setShowOnBoard(false);
    setRecommendationReason("");
  }

  function goToRegister() {
    setScreen("register");
    setSelectedPlace(null);
    setPreviewPlace(null);
    setPlaceSearchResults([]);
    setNewRestaurantName("");
    setNewRestaurantMenu("");
    setMessage("");
  }

  function goToProfile() {
    setScreen("profile");
    setMessage("");
  }

  function goToRankingDetail(rankingItem) {
  setSelectedRanking(rankingItem);
  setScreen("rankingDetail");
  setMessage("");
}

function goBackFromRankingDetail() {
  setSelectedRanking(null);
  setScreen("main");
}
  
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
    setScreen("main");
  } catch (error) {
    console.error(error);
    setMessage("내 정보 저장 실패: " + error.message);
  }
}

function handleSelectRestaurant(restaurant) {
  setPendingRestaurant(restaurant);
  setPreviewPlace(restaurant);
  setShowOnBoard(false);
  setRecommendationReason("");
  setMessage("");
  setScreen("selectDetail");
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
      setScreen("main");

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
    setScreen("main");

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
    if (addRestaurantLockRef.current) {
      return;
    }

    addRestaurantLockRef.current = true;
    setAddRestaurantLoading(true);

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

      await addRestaurant({
        name: selectedPlace.title,
        menu: newRestaurantMenu,
        category: selectedPlace.category || "",
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
      setPreviewPlace(null);

      setMessage("식당이 추가되었습니다.");
      setScreen("main");
    } catch (error) {
      console.error(error);
      setMessage("식당 추가 실패: " + error.message);
    } finally {
      setTimeout(() => {
        addRestaurantLockRef.current = false;
        setAddRestaurantLoading(false);
      }, BUTTON_COOLDOWN_MS);
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
  

    setMessage("");
    setPlaceSearchLoading(true);
    setSelectedPlace(null);
    setPreviewPlace(null);

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
  async function loadPublicMapData() {
    try {
      const restaurantList = await getRestaurants();
      setRestaurants(restaurantList);

      const publicStatus = await getChoiceStatusByDate(selectedDate);
      setPublicMapStatus(publicStatus);

      
    } catch (error) {
      console.error("공개 지도 데이터 불러오기 실패:", error);
    }
  }

  loadPublicMapData();
}, [selectedDate]);

  useEffect(() => {
    const recommendations = choiceStatus.recommendations || [];

    setRecommendationIndex(0);

    if (recommendations.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setRecommendationIndex((prev) => {
        return (prev + 1) % recommendations.length;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [choiceStatus.recommendations]);

  useEffect(() => {
  async function loadOrganizations() {
    try {
      const organizationList = await getOrganizations();
      setOrganizations(organizationList);
    } catch (error) {
      console.error("소속 목록 불러오기 실패:", error);
    }
  }

  loadOrganizations();
}, []);


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
          setScreen("main");

        } else {
          setCurrentUser(null);
          setProfile(null);
          setMyChoice(null);
          setChoiceStatus({
            ranking: [],
            recommendations: []
          });
          

          setEditAffiliation("");
          setEditTeamName("");
          setEditRole("member");
          setScreen("login");


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
      if (signUpLockRef.current) {
        return;
      }

      signUpLockRef.current = true;
      setSignUpLoading(true);

      try {
        setMessage("");

        await signUpUser({
          pbnum,
          name,
          password,
          affiliation: editAffiliation
        });

        setMessage("회원가입 성공. 로그인해주세요.");
        setScreen("login");
        setPassword("");
      } catch (error) {
        console.error(error);
        setMessage("회원가입 실패: " + error.message);
      } finally {
        setTimeout(() => {
          signUpLockRef.current = false;
          setSignUpLoading(false);
        }, BUTTON_COOLDOWN_MS);
      }
    }

  async function handleLogin() {
    try {
      setMessage("");

      await loginUser({ name, password });

      setMessage("로그인 성공");
      setScreen("main");
    } catch (error) {
      console.error(error);
      setMessage("로그인 실패: " + error.message);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      setMessage("로그아웃 완료");
      setScreen("login");
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

const selectListRestaurants = showMapRestaurants
  ? mapVisibleRestaurants
  : filteredRestaurants;

 function isRestaurantInsideBounds(restaurant, bounds) {
    if (!bounds) {
      return false;
    }

    const lat = Number(restaurant.lat);
    const lng = Number(restaurant.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return false;
    }

    return (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    );
  } 

function handleShowMapRestaurants() {
  if (!mapBounds) {
    setMessage("지도가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
    return;
  }

  const visibleRestaurants = restaurants
    .filter((restaurant) => isRestaurantInsideBounds(restaurant, mapBounds))
    .sort((a, b) => {
      return (a.name || "").localeCompare(b.name || "", "ko");
    });

  setMapVisibleRestaurants(visibleRestaurants);
  setShowMapRestaurants(true);
}

const publicRecommendations = choiceStatus.recommendations || [];

const activeRecommendation =
  publicRecommendations.length > 0
    ? publicRecommendations[recommendationIndex % publicRecommendations.length]
    : null;

  function renderRightPanel() {
  if (!currentUser || !profile) {
    if (screen === "signup") {
      return (
        <div className="panel-content auth-panel">
          <div className="brand">
            <div className="brand-icon">🍽️</div>
            <h1>이건 어때</h1>
          </div>

          <h2>회원가입</h2>
          <p className="sub-text">필요한 정보를 입력해 계정을 만들어보세요</p>

          <div className="form-card">
            <input
              placeholder="휴대전화 뒷번호 4자리"
              value={pbnum}
              onChange={(e) => setPbnum(e.target.value)}
            />

            <input
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <input
              list="signup-organization-list"
              placeholder="소속"
              value={editAffiliation}
              onChange={(e) => setEditAffiliation(e.target.value)}
            />

            <datalist id="signup-organization-list">
              {editAffiliation.trim() !== "" &&
                organizations
                  .filter((org) =>
                    org.name.toLowerCase().includes(editAffiliation.toLowerCase())
                  )
                  .map((org) => (
                    <option key={org.id} value={org.name} />
                  ))}
            </datalist>

            <div className="button-row">
              <button
                className="primary-button"
                onClick={handleSignUp}
                disabled={signUpLoading}
              >
                {signUpLoading ? "가입 중..." : "회원가입"}
              </button>
              <button className="outline-button" onClick={() => setScreen("login")}>
                취소
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="panel-content auth-panel">
        <div className="brand">
          <div className="brand-icon">🍽️</div>
          <h1>이건 어때</h1>
        </div>

        <p className="sub-text">맛있는 발견, 좋은 선택</p>

        <div className="form-card">
        

          <input
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="primary-button full" onClick={handleLogin}>
            로그인
          </button>

          <button className="outline-button full" onClick={() => setScreen("signup")}>
            회원가입
          </button>
        </div>
      </div>
    );
  }

  if (screen === "profile") {
    return (
      <div className="panel-content">
        <PanelHeader onBack={goToMain} />

        <h2>내 정보 수정</h2>
        <p className="sub-text">프로필 정보를 수정해보세요</p>

        <div className="form-card">
          <label>이름</label>
          <input value={profile.name || ""} disabled />

          <label>소속</label>
          <input
            list="organization-list"
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

          <label>팀명</label>
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

          <label>역할</label>
          <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
            <option value="member">조원</option>
            <option value="leader">조장</option>
          </select>

          <button className="primary-button full" onClick={handleUpdateProfile}>
            저장
          </button>
        </div>
      </div>
    );
  }

  if (screen === "selectList") {
    return (
      <div className="panel-content">
        <PanelHeader onBack={goToMain} />

        <h2>식당 선택</h2>
        <p className="sub-text">오늘 갈 식당을 골라보세요</p>

        <input
          className="search-input"
          placeholder="식당 이름 또는 추천 메뉴 검색"
          value={restaurantSearchKeyword}
          onChange={(e) => {
          setRestaurantSearchKeyword(e.target.value);
          setShowMapRestaurants(false);
          setMapVisibleRestaurants([]);
        }}
        />

        <button
          className="outline-button full"
          onClick={handleShowMapRestaurants}
        >
          현재 지도 안의 식당 보기
        </button>



        <div className="restaurant-list">
          {selectListRestaurants.length === 0 ? (
            <p>검색 결과가 없습니다.</p>
          ) : (
            selectListRestaurants.map((restaurant) => {
              const rankingItem = choiceStatus.ranking.find(
                (item) => item.restaurantId === restaurant.id
              );
              const count = rankingItem ? rankingItem.count : 0;

              return (
                <button
                  key={restaurant.id}
                  className="restaurant-card"
                  onClick={() => handleSelectRestaurant(restaurant)}
                >
                  <div>
                    <strong>{restaurant.name}</strong>

                    {restaurant.category && (
                      <p>카테고리: {restaurant.category}</p>
                    )}

                    {restaurant.menu && (
                      <p>추천 메뉴: {restaurant.menu}</p>
                    )}
                  </div>

                  <span>{count}명</span>
                </button>
              );
            })
          )}
        </div>

        <div className="bottom-actions">
          <button className="primary-button" onClick={goToMain}>
            뒤로
          </button>
        </div>
      </div>
    );
  }

  if (screen === "selectDetail") {
    return (
      <div className="panel-content">
        <PanelHeader onBack={goToSelectList} />

        <h2>식당 선택</h2>
        <p className="sub-text">선택할 식당 정보를 확인하고 추천 멘트를 남겨보세요</p>

        {pendingRestaurant && (
          <>
            <div className="selected-restaurant-card">
              <h3>{pendingRestaurant.name}</h3>
              {pendingRestaurant.roadAddress && <p>{pendingRestaurant.roadAddress}</p>}

              <label>추천 메뉴</label>
              <input
                placeholder="추천 메뉴를 입력하세요"
                value={pendingRestaurant.menu || ""}
                readOnly
              />
            </div>

            {profile.role === "leader" && (
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={selectWithTeam}
                  onChange={(e) => setSelectWithTeam(e.target.checked)}
                />
                조원과 함께하기
              </label>
            )}

            <label className="check-row">
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
              모두에게 추천하기
            </label>

            <label>추천 멘트</label>
            <textarea
              placeholder="추천 이유나 한마디를 입력하세요"
              value={recommendationReason}
              onChange={(e) => setRecommendationReason(e.target.value)}
              maxLength={300}
            />

            <div className="button-row">
              <button className="primary-button" onClick={handleConfirmSelectRestaurant}>
                선택하기
              </button>
              <button className="outline-button" onClick={goToSelectList}>
                취소
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (screen === "register") {
    return (
      <div className="panel-content">
        <PanelHeader onBack={goToMain} />

        <h2>식당 등록</h2>
        <p className="sub-text">등록할 식당을 검색하고 설명을 남겨보세요</p>

        <div className="search-row">
          <input
            placeholder="식당 이름을 검색하세요"
            value={newRestaurantName}
            onChange={(e) => {
              setNewRestaurantName(e.target.value);
              setSelectedPlace(null);
              setPlaceSearchResults([]);
            }}
          />
          <button onClick={handleSearchPlace} disabled={placeSearchLoading}>
            {placeSearchLoading ? "검색 중" : "검색"}
          </button>
        </div>

        <h3>검색 결과</h3>

        <div className="restaurant-list">
          {placeSearchResults.map((place, index) => (
            <button
              key={`${place.title}-${index}`}
              className={`restaurant-card ${
                selectedPlace === place ? "selected" : ""
              }`}
              onClick={() => {
                setSelectedPlace(place);
                setPreviewPlace(place);
                setNewRestaurantName(place.title);
              }}
            >
              <div>
                <strong>{place.title}</strong>

                {place.category && (
                  <p>카테고리: {place.category}</p>
                )}

                {(place.roadAddress || place.address) && (
                  <p>위치: {place.roadAddress || place.address}</p>
                )}
              </div>

              <span>{selectedPlace === place ? "✓" : "○"}</span>
            </button>
          ))}
        </div>

        <label>추천 메뉴</label>
        <textarea
          placeholder="추천메뉴가 있다면 적어주세요"
          value={newRestaurantMenu}
          onChange={(e) => setNewRestaurantMenu(e.target.value)}
          maxLength={300}
        />

        <div className="button-row">
          <button
            className="primary-button"
            onClick={handleAddRestaurant}
            disabled={addRestaurantLoading}
          >
            {addRestaurantLoading ? "등록 중..." : "등록하기"}
          </button>
          <button className="outline-button" onClick={goToMain}>
            취소
          </button>
        </div>
      </div>
    );
  }

  if (screen === "rankingDetail") {
  const rankingRestaurant = restaurants.find(
    (restaurant) => restaurant.id === selectedRanking?.restaurantId
  );

  return (
    <div className="panel-content">
      <PanelHeader onBack={goBackFromRankingDetail} />

      <h2>식당 랭킹 상세</h2>

      {!selectedRanking ? (
        <p>선택된 식당 정보가 없습니다.</p>
      ) : (
        <>
          <div className="ranking-detail-card">
            <div className="ranking-detail-info">
              <h3>{selectedRanking.restaurantName}</h3>

              <p>
                오늘 랭킹{" "}
                <strong>{selectedRanking.rank || "-" }위</strong>
                {" · "}
                참여 인원{" "}
                <strong>{selectedRanking.count}명</strong>
              </p>

              {rankingRestaurant?.menu && (
                <p>
                  <strong>추천 메뉴</strong>{" "}
                  {rankingRestaurant.menu}
                </p>
              )}
            </div>
          </div>

          <h3 className="detail-section-title">이 식당을 고른 사람들</h3>

          <div className="picked-user-list">
            {selectedRanking.users && selectedRanking.users.length > 0 ? (
              selectedRanking.users.map((user) => (
                <div
                  className="picked-user-row"
                  key={user.userId}
                >
                  <div className="picked-user-avatar">
                    {user.userName?.slice(0, 1) || "?"}
                  </div>

                  <strong>{user.userName}</strong>

                  <span>
                    {user.teamName || user.affiliation || "소속 미설정"}
                  </span>
                </div>
              ))
            ) : (
              <p>선택한 사람이 없습니다.</p>
            )}
          </div>

          <button
            className="primary-button full"
            onClick={goBackFromRankingDetail}
          >
            돌아가기
          </button>
        </>
      )}
    </div>
  );
}

  return (
    <div className="panel-content">
      <PanelHeader onProfile={goToProfile} />

      <div className="welcome-card recommendation-card">
        {activeRecommendation ? (
          <>
            <p className="recommendation-label">오늘의 제안</p>

            <h2>{activeRecommendation.restaurantName}</h2>

            <p>
              <strong>{activeRecommendation.userName}</strong>님이 추천했어요.
            </p>

            {activeRecommendation.recommendationReason ? (
              <p className="recommendation-text">
                “{activeRecommendation.recommendationReason}”
              </p>
            ) : (
              <p className="recommendation-text">
                추천 멘트는 없지만, 오늘의 선택으로 올라왔어요.
              </p>
            )}

            {publicRecommendations.length > 1 && (
              <p className="recommendation-count">
                {recommendationIndex + 1} / {publicRecommendations.length}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="recommendation-label">오늘의 제안</p>
            <h2>{profile.name}님,</h2>
            <p>아직 모두에게 공개된 제안이 없습니다.</p>
          </>
        )}
      </div>

      <div className="ranking-card">
        <div className="section-title">
          <h3>오늘의 식당 랭킹</h3>
          <span>참여 인원 기준</span>
        </div>

        {choiceStatus.ranking.length === 0 ? (
          <p>아직 선택한 사람이 없습니다.</p>
        ) : (
          choiceStatus.ranking.slice(0, 5).map((item, index) => (
          <button
            className="rank-row rank-row-button"
            key={item.restaurantId}
            onClick={() =>
              goToRankingDetail({
                ...item,
                rank: index + 1
              })
            }
          >
            <span className="rank-number">{index + 1}</span>
            <strong>{item.restaurantName}</strong>
            <span>{item.count}명</span>
          </button>
        ))
        )}
      </div>

      <div className="button-row">
        <button className="primary-button" onClick={goToSelectList}>
          식당 선택
        </button>
        <button className="outline-button" onClick={goToRegister}>
          식당 등록
        </button>
      </div>

      {myChoice && (
        <div className="my-choice-box">
           오늘 내 선택: <strong>{myChoice.restaurantName}</strong>
          <button onClick={handleCancelChoice}>선택 취소</button> 
        </div>
      )}

      <button className="text-button" onClick={handleLogout}>
        로그아웃
      </button>
    </div>
  );
}

function PanelHeader({ onBack, onProfile }) {
  return (
    <div className="panel-header">
      <div className="mini-brand">
        <span>🍽️</span>
        <strong>이건 어때</strong>
      </div>

      {onBack && (
        <button className="small-button" onClick={onBack}>
          뒤로
        </button>
      )}

      {onProfile && (
        <button className="small-button" onClick={onProfile}>
          내 정보
        </button>
      )}
    </div>
  );
}


  return (
  <div className="app-layout">
    <div className="map-panel">
      <NaverMap
        restaurants={restaurants}
        choiceRanking={
          currentUser && profile
            ? choiceStatus.ranking
            : publicMapStatus.ranking
        }
        previewPlace={previewPlace}
        highlightedRestaurants={mapVisibleRestaurants}
        onHighlightedRestaurantSelect={handleSelectRestaurant}
        onMapCenterChange={setMapCenter}
        onMapBoundsChange={setMapBounds}
      />
    </div>

    <aside className="side-panel">
      {renderRightPanel()}

      {/* {message && <p className="message-text">{message}</p>} */}
    </aside>
  </div>
);
}

export default App;