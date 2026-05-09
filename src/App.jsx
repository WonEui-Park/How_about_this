import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { signUpUser, loginUser } from "./authService";
import { getUserProfile } from "./userService";
import { selectRestaurant, getMyChoiceByDate } from "./choiceService";
import { getRestaurants } from "./restaurantService";
import { getTodayString } from "./utils/dateUtils";
import { getChoiceStatusByDate } from "./statusService";
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
  const [choiceStatus, setChoiceStatus] = useState([]);

  async function handleSelectRestaurant(restaurant) {
  try {
    setMessage("");

    const savedChoice = await selectRestaurant({
      userProfile: profile,
      restaurant,
      selectedDate
    });

    const choice = await getMyChoiceByDate(profile.uid, selectedDate);
    setMyChoice(choice);

    const status = await getChoiceStatusByDate(selectedDate);
    setChoiceStatus(status);

    setMessage(`${savedChoice.date} 날짜에 ${savedChoice.restaurantName} 선택 완료`);
  } catch (error) {
    console.error(error);
    setMessage("식당 선택 실패: " + error.message);
  }
}


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUser(user);

          const userProfile = await getUserProfile(user.uid);
          setProfile(userProfile);

          const restaurantList = await getRestaurants();
          setRestaurants(restaurantList);

          const choice = await getMyChoiceByDate(user.uid, selectedDate);
          setMyChoice(choice);

          const status = await getChoiceStatusByDate(selectedDate);
          setChoiceStatus(status);

        } else {
          setCurrentUser(null);
          setProfile(null);
          setRestaurants([]);
          setMyChoice(null);
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

  if (loading) {
    return <div style={{ padding: "40px" }}>로딩 중...</div>;
  }

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
          <h2>{selectedDate}에 선택한 식당</h2>

{myChoice ? (
  <p>
    <strong>{myChoice.restaurantName}</strong> 선택됨
  </p>
) : (
  <p>아직 선택한 식당이 없습니다.</p>
)}
<h2>기준 날짜</h2>

<input
  type="date"
  value={selectedDate}
  onChange={async (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);

    if (profile) {
      const choice = await getMyChoiceByDate(profile.uid, newDate);
      setMyChoice(choice);

      const status = await getChoiceStatusByDate(newDate);
      setChoiceStatus(status);
    }
  }}
/>

<h2>{selectedDate} 선택 현황</h2>

{choiceStatus.length === 0 ? (
  <p>아직 선택한 사람이 없습니다.</p>
) : (
  <ul>
    {choiceStatus.map((status) => (
      <li key={status.restaurantId} style={{ marginBottom: "16px" }}>
        <strong>{status.restaurantName}</strong>: {status.count}명
        <br />
        선택자:{" "}
        {status.users.map((user) => user.userName).join(", ")}
      </li>
    ))}
  </ul>
)}


<h2>식당 목록</h2>

{restaurants.length === 0 ? (
  <p>등록된 식당이 없습니다.</p>
) : (
  <ul>
    {restaurants.map((restaurant) => (
      <li key={restaurant.id} style={{ marginBottom: "16px" }}>
        <strong>{restaurant.name}</strong>
        <br />
        추천 메뉴: {restaurant.menu}
        <br />
        가격대: {restaurant.priceRange}
        <br />
        <button onClick={() => handleSelectRestaurant(restaurant)}>
          선택
        </button>
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