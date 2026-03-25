# SWCMT 2026 Spring Event Map

`Firebase Hosting` 기반의 행사 지도 웹앱입니다.
기존 `Swcmt2026SpringEvent`와 같은 Firebase 프로젝트를 사용하지만, 지도 혼잡도 표시와 설정을 위한 별도 컬렉션만 사용하도록 분리했습니다.

## 구성

- `index.html`: 메인 지도 화면
- `settings.html`: URL로 직접 접근하는 설정 화면
- `app.js`: 메인 지도 UI, 하단 메뉴 필터, 혼잡도 표시
- `settings.js`: 항목 추가, 상태 변경, 좌표 수정
- `map-data.js`: 카테고리, 상태, 초기 항목 정의
- `firebase-config.js`: Firebase Web App 설정
- `firestore.rules`: 지도 전용 컬렉션 규칙
- `map.png`: 지도 원본 이미지
- `DESIGN_COLOR_GUIDE.md`: 컬러 가이드

## Firebase 프로젝트

이 저장소는 `.firebaserc`에 연결된 기본 프로젝트를 사용합니다.

- Project ID: `swcmt2026springevent-a8d8f`

즉, 이 폴더에서는 별도 `--project` 옵션 없이 `firebase.cmd` 명령을 실행해도 됩니다.

## Firestore 저장 위치

기존 프로젝트의 `eventApplications` 컬렉션은 건드리지 않습니다.
지도 데이터는 아래 별도 컬렉션에만 저장합니다.

- `eventMapCongestionItems`

저장 필드 예시:

```json
{
  "name": "꼬마기차",
  "category": "experience",
  "status": "smooth",
  "x": 646,
  "y": 795,
  "sortOrder": 1
}
```

## 메인 화면

- 하단 메뉴: `체험`, `만들기`, `공연`, `식당`
- 메뉴를 누르면 해당 카테고리 항목만 혼잡도 배지가 지도에 표시됩니다.
- 혼잡도 상태는 `원활`, `보통`, `혼잡` 3단계입니다.
- 좌우 이동은 드래그 또는 `<<`, `>>` 버튼으로 할 수 있습니다.

## 설정 화면

설정 화면은 메인 화면에서 링크하지 않으며 URL로 직접 들어갑니다.

- 로컬: `http://127.0.0.1:5000/settings`
- 배포 후: `https://<your-hosting-domain>/settings`

설정 화면 기능:

- 상단에서 새 항목 추가
- 항목별 상태 변경
- 항목명 클릭 시 좌표 수정
- 카테고리 변경

## 로컬 테스트

프로젝트 루트:

```powershell
cd D:\Workspace\GitHub\Swcmt2026SpringEventMap
```

Firebase 로그인:

```powershell
firebase.cmd login
```

Hosting + Firestore 에뮬레이터 실행:

```powershell
firebase.cmd emulators:start --only hosting,firestore --import .emulator-data --export-on-exit
```

확인 주소:

- 메인: `http://127.0.0.1:5000`
- 설정: `http://127.0.0.1:5000/settings`

## Firestore 규칙 배포

로컬에서는 `127.0.0.1` 접속 시 Firestore Emulator(`127.0.0.1:8084`)를 자동 사용합니다.
위 명령은 `.emulator-data` 폴더를 사용해서 에뮬레이터 종료 시 데이터를 저장하고, 다음 실행 때 다시 불러옵니다.
이 저장소는 `.emulator-data` 폴더도 Git에 포함할 수 있으므로, 현재 로컬 에뮬레이터 데이터 상태를 그대로 GitHub에 같이 올릴 수 있습니다.
배포 환경에서 Firestore 저장을 실제로 사용하려면 Hosting뿐 아니라 Firestore 규칙도 같이 배포해야 합니다.

```powershell
firebase.cmd deploy --only hosting,firestore:rules
```

이 저장소의 Hosting 배포 대상은 `swcmt2026springeventmap.web.app`로 고정되어 있습니다.

이미 Hosting만 배포한 적이 있더라도, 설정 화면 저장 기능을 쓰려면 위 명령으로 규칙 반영이 필요합니다.

## GitHub 작업 흐름

```powershell
git add .
git commit -m "Add category filter and Firestore-backed map settings"
git push
```

## 참고 사항

- 현재 `firestore.rules`는 지도 전용 컬렉션 `eventMapCongestionItems`에 대해 읽기/쓰기를 허용합니다.
- 이 설정은 내부용 빠른 운영에는 편하지만 보안은 약하므로, 실제 운영 단계에서는 인증 또는 관리자 제한을 추가하는 편이 좋습니다.

## 에뮬레이터 데이터를 실제 Firestore로 업로드

현재 프로젝트는 지도 데이터만 별도 컬렉션 `eventMapCongestionItems`에 저장하므로, 에뮬레이터에서 확인한 데이터를 실제 Firestore로 올릴 때는 아래 스크립트를 사용하면 됩니다.

```powershell
node .\scripts\push-map-data-to-firestore.js
```

기본 동작:

- source: Firestore Emulator `127.0.0.1:8084`
- target: 실제 Firebase 프로젝트 `swcmt2026springevent-a8d8f`
- collection: `eventMapCongestionItems`
- document id 유지
- `set(..., { merge: true })` 방식으로 업로드

다른 컬렉션을 직접 지정하려면:

```powershell
node .\scripts\push-map-data-to-firestore.js yourCollectionName
```

이 스크립트는 `GOOGLE_APPLICATION_CREDENTIALS`와 `GCLOUD_PROJECT` 환경 변수를 사용합니다.
