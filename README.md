# SWCMT 2026 Spring Event Map

`Firebase Hosting` 기반의 행사 지도 웹앱입니다.  
기존 `Swcmt2026SpringEvent`와 같은 Firebase 프로젝트를 사용하지만, 지도 표시와 혼잡도 관리는 별도 컬렉션으로 분리되어 있습니다.

## 구성

- `index.html`: 메인 지도 화면
- `settings.html`: 관리자 전용 설정 화면
- `app.js`: 지도 UI, 카테고리 메뉴, 혼잡도 표시
- `settings.js`: 관리자 로그인, 항목 추가, 상태 변경, 좌표 수정
- `map-data.js`: 카테고리, 상태, 초기 항목 정의
- `firebase-config.js`: Firebase Web App 설정
- `firestore.rules`: 지도용 Firestore 규칙
- `scripts/push-map-data-to-firestore.js`: Emulator 데이터를 실제 Firestore로 업로드

## Firebase 프로젝트

이 저장소는 `.firebaserc`에 연결된 기본 프로젝트를 사용합니다.

- Project ID: `swcmt2026springevent-a8d8f`

따라서 이 폴더에서는 보통 `--project` 옵션 없이 `firebase.cmd` 명령을 실행하면 됩니다.

## Hosting 배포 대상

이 저장소의 Hosting 배포 대상은 아래 사이트로 고정되어 있습니다.

- `swcmt2026springeventmap.web.app`

즉 이 폴더에서 `firebase.cmd deploy`를 실행하면 map 전용 Hosting 사이트로 배포됩니다.

## Firestore 데이터 위치

기존 프로젝트의 `eventApplications` 컬렉션은 건드리지 않습니다.  
지도 데이터는 아래 컬렉션만 사용합니다.

- `eventMapCongestionItems`

예시 문서:

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
- 선택한 카테고리 항목만 지도 위에 혼잡도 배지로 표시
- 상태는 `원활`, `보통`, `혼잡` 3단계
- 지도는 좌우 드래그와 `<<`, `>>` 버튼으로 이동 가능

## 설정 화면

설정 화면은 메인에서 링크하지 않고 URL로 직접 접속합니다.

- 로컬: `http://127.0.0.1:5000/settings`
- 배포: `https://swcmt2026springeventmap.web.app/settings`

기능:

- 관리자 로그인
- 항목 추가
- 상태 변경
- 좌표 수정
- 카테고리 변경
- `지도에서 선택` 버튼으로 좌표 입력
- 각 항목별 공개 상태 변경 URL 확인

## 공개 혼잡도 변경 페이지

특정 담당자에게는 별도 관리자 권한 없이 상태만 바꿀 수 있는 전용 URL을 전달할 수 있습니다.

- 형식: `/status?item=<base64로 인코딩된 항목명>`
- 상단: 항목명과 현재 혼잡도 표시
- 하단: `원활`, `보통`, `혼잡` 버튼 3개
- 버튼을 누르면 Firestore에 즉시 반영

이 페이지는 URL을 아는 사람만 접근하는 운영 방식입니다.  
보안은 강한 인증이 아니라 URL 비공개에 의존하므로, 공개 배포 링크처럼 널리 공유하지 않는 것이 좋습니다.

## 관리자 로그인 절차

`Swcmt2026SpringEvent`의 관리자 페이지와 같은 방식입니다.

1. Firebase Authentication의 `Google` 제공자를 활성화합니다.
2. 관리자로 사용할 Google 계정으로 한 번 로그인합니다.
3. 해당 계정에 `admin` custom claim을 부여합니다.
4. 다시 로그인하면 `/settings`에서 관리자 화면이 열립니다.

현재 권한 규칙:

- `eventMapCongestionItems` 읽기: 공개
- `eventMapCongestionItems` 쓰기: `request.auth.token.admin == true`

즉 로그인만으로는 부족하고, 반드시 `admin claim`이 있는 계정이어야 수정 가능합니다.

## 관리자 권한 부여

기존 프로젝트의 관리자 권한 부여 스크립트를 그대로 사용합니다.

필요한 환경 변수:

- `GCLOUD_PROJECT=swcmt2026springevent-a8d8f`
- `GOOGLE_APPLICATION_CREDENTIALS=<service-account.json 경로>`

실제 Firebase Authentication 사용자에게 관리자 권한 부여:

```powershell
node ..\Swcmt2026SpringEvent\functions\scripts\set-admin-claim.js your-email@example.com
```

로컬 Auth Emulator 사용자에게 관리자 권한 부여:

```powershell
$env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
node ..\Swcmt2026SpringEvent\functions\scripts\set-admin-claim.js your-email@example.com
```

권한을 부여한 뒤에는 로그아웃 후 다시 로그인해 토큰을 새로 받아야 합니다.

중요:

- `http://127.0.0.1:5000/settings` 는 `Auth Emulator` 사용자를 봅니다.
- `https://swcmt2026springeventmap.web.app/settings` 는 실제 Firebase Authentication 사용자를 봅니다.
- 즉 로컬 화면에서 관리자 권한을 테스트할 때는 `FIREBASE_AUTH_EMULATOR_HOST`를 설정한 상태로 claim을 부여해야 합니다.
- 반대로 실서버에서 관리자 권한을 쓰려면 `FIREBASE_AUTH_EMULATOR_HOST` 없이 실제 사용자에게 claim을 부여해야 합니다.

로컬 테스트 순서:

1. Emulator 실행

```powershell
firebase.cmd emulators:start --only hosting,firestore,auth --import .emulator-data --export-on-exit
```

2. `http://127.0.0.1:5000/settings` 에서 Google 로그인 한 번 수행

3. 새 PowerShell에서 emulator 대상 claim 부여

```powershell
$env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
node ..\Swcmt2026SpringEvent\functions\scripts\set-admin-claim.js your-email@example.com
```

4. `/settings` 에서 로그아웃 후 다시 로그인

## 로컬 테스트

프로젝트 루트:

```powershell
cd D:\Workspace\GitHub\Swcmt2026SpringEventMap
```

Firebase 로그인:

```powershell
firebase.cmd login
```

Hosting + Firestore + Auth Emulator 실행:

```powershell
firebase.cmd emulators:start --only hosting,firestore,auth --import .emulator-data --export-on-exit
```

확인 주소:

- 메인: `http://127.0.0.1:5000`
- 설정: `http://127.0.0.1:5000/settings`

로컬에서는 다음 Emulator를 사용합니다.

- Hosting Emulator: `127.0.0.1:5000`
- Firestore Emulator: `127.0.0.1:8084`
- Auth Emulator: `127.0.0.1:9099`

로컬 `/settings` 로그인은 Auth Emulator 호환을 위해 `popup` 대신 `redirect` 방식으로 동작합니다.

`.emulator-data`를 사용하면 종료 시 데이터가 저장되고, 다음 실행 때 다시 불러옵니다.

## 배포

Hosting과 Firestore 규칙 같이 배포:

```powershell
firebase.cmd deploy --only hosting,firestore:rules
```

전체 기본 배포:

```powershell
firebase.cmd deploy
```

설정 화면 권한은 `firestore.rules`에 의존하므로, Hosting만 배포하면 `/settings`가 정상 동작하지 않을 수 있습니다.

## Emulator 데이터를 실제 Firestore로 업로드

```powershell
node .\scripts\push-map-data-to-firestore.js
```

기본 동작:

- source: Firestore Emulator `127.0.0.1:8084`
- target: 실제 Firebase 프로젝트 `swcmt2026springevent-a8d8f`
- collection: `eventMapCongestionItems`
- document id 유지
- `set(..., { merge: true })` 방식으로 업로드

다른 컬렉션을 지정하려면:

```powershell
node .\scripts\push-map-data-to-firestore.js yourCollectionName
```

## GitHub 작업 흐름

```powershell
git add .
git commit -m "Update map app"
git push
```

## 참고

- 같은 Firebase 프로젝트를 쓰는 다른 저장소에서 `firestore.rules`를 배포하면 프로젝트 전체 규칙이 덮어써집니다.
- 그래서 `Swcmt2026SpringEvent`와 `Swcmt2026SpringEventMap`의 `firestore.rules`는 항상 같은 내용으로 유지하는 것이 좋습니다.
