# 이건 어때

> 지도 기반 팀 점심 식당 선택 및 추천 공유 웹 애플리케이션

**이건 어때**는 교육 과정이나 팀 단위 환경에서 점심 식당을 더 편하게 정하기 위해 제작한 웹 애플리케이션입니다.
사용자는 식당을 등록하고, 지도에서 위치를 확인하며, 오늘 갈 식당을 선택할 수 있습니다. 또한 팀 단위 선택, 추천 멘트 공유, 식당 랭킹 기능을 통해 여러 사람이 함께 식당을 고를 때 발생하는 불편함을 줄이는 것을 목표로 했습니다.

## 배포 링크

🔗 [서비스 바로가기](https://how-about-this-aa161.web.app/)

---

## 프로젝트 개요

* **프로젝트명**: 이건 어때
* **개발 형태**: 개인 프로젝트
* **개발 목적**: 팀 단위 점심 식당 선택 과정의 불편함 개선
* **주요 기능**: 식당 등록, 지도 기반 식당 검색, 식당 선택, 팀원 함께 선택, 추천 멘트 공유, 랭킹 표시
* **배포 환경**: Firebase Hosting
* **데이터베이스**: Firebase Firestore
* **지도 API**: Naver Maps JavaScript API
* **검색 API**: Naver Local Search API + Firebase Functions

---

## 개발 배경

반도체 공정 교육 과정에 참여하면서 매일 점심 식사를 정하는 과정에서 불편함을 느꼈습니다.
여러 명이 함께 식당을 고르다 보니, 매번 후보를 공유하고, 누가 어디를 선택했는지 확인하고, 팀 단위로 선택을 맞추는 과정이 반복되었습니다.

이 문제를 해결하기 위해 다음과 같은 기능을 가진 웹앱을 직접 제작했습니다.

* 주변 식당을 지도 기반으로 등록
* 사용자가 오늘 갈 식당을 선택
* 선택 인원 기준으로 식당 랭킹 표시
* 추천 멘트를 통해 식당 추천 공유
* 조장이 팀원 전체 식당을 한 번에 선택 가능
* 지도 화면 안의 식당만 필터링하여 확인 가능

---

## 주요 기능

### 1. 회원가입 및 로그인

사용자는 이름, 비밀번호, 소속 정보를 입력해 회원가입할 수 있습니다.
로그인 후 개인 프로필을 기반으로 소속, 팀명, 역할 정보를 관리할 수 있습니다.

### 2. 지도 기반 식당 등록

Naver Local Search API를 활용해 식당을 검색하고, 검색 결과에서 식당을 선택해 등록할 수 있습니다.
등록 시 식당명, 카테고리, 주소, 좌표 정보가 Firestore에 저장됩니다.

### 3. 식당 선택

등록된 식당 목록에서 오늘 갈 식당을 선택할 수 있습니다.
식당 선택 시 추천 메뉴와 주소를 확인할 수 있으며, 추천 멘트를 남겨 다른 사용자에게 공유할 수 있습니다.

### 4. 팀원 함께 선택

사용자의 역할이 조장인 경우, 같은 소속과 같은 팀에 속한 팀원들의 식당 선택을 한 번에 적용할 수 있습니다.
이를 통해 팀 단위 식사 선택 상황에서 반복 입력을 줄였습니다.

### 5. 오늘의 식당 랭킹

사용자들의 선택 데이터를 기반으로 오늘 가장 많이 선택된 식당을 랭킹 형태로 보여줍니다.
랭킹 항목을 클릭하면 해당 식당을 선택한 사용자 목록을 확인할 수 있습니다.

### 6. 지도 화면 안의 식당 보기

사용자가 현재 보고 있는 지도 범위 안에 존재하는 등록 식당만 필터링하여 확인할 수 있습니다.
필터링된 식당은 오른쪽 리스트와 왼쪽 지도 마커로 동시에 표시됩니다.

### 7. 현재 위치 및 저장 위치 이동

사용자의 현재 위치를 지도에 표시하고, 버튼을 통해 현재 위치로 이동할 수 있도록 구현했습니다.
또한 사용자가 자주 보는 위치를 저장하고, 저장된 위치로 빠르게 이동할 수 있는 기능을 추가할 예정입니다.

---

## 기술 스택

### Frontend

* React
* Vite
* JavaScript
* CSS

### Backend / Database

* Firebase Authentication
* Firebase Firestore
* Firebase Functions
* Firebase Hosting

### External API

* Naver Maps JavaScript API
* Naver Local Search API

### Version Control

* Git
* GitHub

---

## 시스템 구조

```text
React Client
  ├─ Firebase Authentication
  ├─ Firestore Database
  ├─ Naver Maps JavaScript API
  └─ Firebase Functions
        └─ Naver Local Search API 호출
```

클라이언트에서 직접 Naver Search API Secret을 사용하지 않고, Firebase Functions를 통해 API 요청을 처리했습니다.
이를 통해 검색 API Secret이 브라우저에 노출되지 않도록 구성했습니다.

---

## 데이터 구조 예시

### users

```javascript
{
  uid: string,
  name: string,
  affiliation: string,
  teamName: string,
  role: "member" | "leader",
  isAdmin: boolean,
  createdAt: timestamp
}
```

### restaurants

```javascript
{
  name: string,
  menu: string,
  category: string,
  address: string,
  roadAddress: string,
  lat: number,
  lng: number,
  mapProvider: "naver",
  placeKey: string,
  createdBy: string,
  createdAt: timestamp
}
```

### dailyChoices

```javascript
{
  date: string,
  userId: string,
  userName: string,
  affiliation: string,
  teamName: string,
  restaurantId: string,
  restaurantName: string,
  isPublicRecommendation: boolean,
  recommendationReason: string,
  updatedAt: timestamp
}
```

---

## 핵심 구현 내용

### Firebase Functions를 통한 API Secret 보호

Naver Local Search API는 Client ID와 Client Secret이 필요하기 때문에, 프론트엔드에서 직접 호출하면 Secret이 노출될 위험이 있습니다.
이를 방지하기 위해 Firebase Functions에서 Naver Search API를 호출하도록 구현했습니다.

프론트엔드는 Firebase Functions만 호출하고, 실제 API Secret은 Firebase Secret Manager를 통해 관리했습니다.

### 지도 범위 기반 식당 필터링

Naver Map의 현재 bounds 값을 React 상태로 전달하고, 식당의 위도/경도와 비교해 현재 지도 화면 안에 있는 식당만 필터링했습니다.

이를 통해 사용자는 지도에서 보고 있는 지역 안의 식당만 빠르게 확인할 수 있습니다.

### 중복 등록 및 중복 클릭 방지

식당 등록이나 회원가입 과정에서 버튼을 여러 번 클릭하면 중복 요청이 발생할 수 있었습니다.
이를 방지하기 위해 요청 진행 중 버튼을 비활성화하고, 일정 시간 동안 재요청을 막는 lock 처리를 추가했습니다.

### 팀 단위 선택 처리

조장 사용자가 `조원과 함께하기` 옵션을 선택하면 같은 소속과 팀명을 가진 사용자 목록을 조회한 뒤, 각 사용자에 대해 식당 선택 데이터를 생성하도록 구현했습니다.

---

## 트러블슈팅

### 1. CORS 오류 해결

Firebase Functions에서 Naver Search API를 호출하는 과정에서 로컬 개발 환경과 배포 환경의 Origin 차이로 CORS 오류가 발생했습니다.
Functions의 CORS 설정에 로컬 개발 주소와 Firebase Hosting 주소를 추가하여 해결했습니다.

### 2. 지도 좌표 저장 문제

초기에는 식당 주소만 저장되어 지도에 마커를 표시할 수 없는 문제가 있었습니다.
Naver 검색 결과에서 제공되는 좌표 정보를 활용해 식당 등록 시 위도와 경도를 함께 저장하도록 수정했습니다.

### 3. 모바일 다크모드 글자 표시 문제

모바일 브라우저가 다크모드일 때 input, button, 제목 글자 색상이 자동으로 변경되어 일부 텍스트가 보이지 않는 문제가 있었습니다.
CSS에서 `color-scheme: light`를 지정하고, input, textarea, button, 제목 요소의 색상을 명시적으로 지정해 해결했습니다.

### 4. Firebase Hosting 캐시 문제

배포 후에도 이전 화면이 표시되는 문제가 발생했습니다.
`firebase.json`에서 `index.html`에 Cache-Control 설정을 추가하여 최신 배포본이 반영되도록 개선했습니다.

---


## 향후 개선 방향

* 이메일 기반 비밀번호 찾기 기능 추가
* 날짜별 식당 선택 기능 추가
* 모바일 UI 최적화
* 추천 멘트 기반 식당 추천 기능 강화
* 사용자별 즐겨찾기 식당 기능 추가
* 저장 위치 이동 기능 고도화


---

## 프로젝트를 통해 배운 점

이 프로젝트를 통해 단순히 화면을 구현하는 것을 넘어, 실제 사용자가 겪는 문제를 정의하고 이를 웹 서비스 기능으로 연결하는 경험을 할 수 있었습니다.

특히 Firebase Authentication, Firestore, Functions, Hosting을 함께 사용하면서 프론트엔드와 백엔드가 연결되는 구조를 이해할 수 있었고, 외부 API Secret을 안전하게 관리하는 방법을 학습했습니다.

또한 지도 기반 UI, 위치 데이터 처리, 팀 단위 데이터 처리, 중복 요청 방지, 모바일 브라우저 대응 등 실제 서비스 운영에 가까운 문제를 직접 해결하며 웹 애플리케이션 개발 전반에 대한 이해도를 높일 수 있었습니다.
