ㅇ# Qvick API - Azure Functions

이 디렉토리는 Qvick 웹 애플리케이션의 Azure Functions API를 포함합니다.

## 기능

### 1. 공지사항 글 다듬기 (refineAnnouncement)
OpenAI GPT-4o-mini를 사용하여 공지사항 내용을 자동으로 다듬어주는 기능입니다.

**엔드포인트**: `POST /api/refineAnnouncement`

**요청 본문**:
```json
{
  "content": "다듬을 공지사항 내용"
}
```

**응답**:
```json
{
  "refinedContent": "다듬어진 마크다운 형식의 내용",
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 200,
    "total_tokens": 300
  }
}
```

## 로컬 개발 환경 설정

### 1. 의존성 설치
```bash
cd api
npm install
```

### 2. Azure Functions Core Tools 설치
```bash
# macOS (Homebrew 사용)
brew tap azure/functions
brew install azure-functions-core-tools@4

# Windows (chocolatey 사용)
choco install azure-functions-core-tools

# npm 사용 (모든 플랫폼)
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

### 3. 환경 변수 설정
`local.settings.json` 파일에서 OpenAI API 키를 설정하세요:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "OPENAI_API_KEY": "sk-your-actual-openai-api-key"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

### 4. 로컬 실행
```bash
npm run build  # TypeScript 컴파일
npm start      # Azure Functions 로컬 서버 시작
```

함수는 `http://localhost:7071/api/refineAnnouncement`에서 실행됩니다.

## Azure 배포 설정

### 1. Azure Portal에서 환경 변수 설정
Azure Static Web App의 Configuration 섹션에서 다음 환경 변수를 추가하세요:

- `OPENAI_API_KEY`: OpenAI API 키
- `FIREBASE_PROJECT_ID`: Firebase 프로젝트 ID
- `FIREBASE_CLIENT_EMAIL`: Firebase 서비스 계정 client_email
- `FIREBASE_PRIVATE_KEY`: Firebase 서비스 계정 private_key

패치노트 API는 Firestore를 사용하므로 위 Firebase 환경 변수가 없으면 `/api/getPublishedPatchnotes`를 포함한 패치노트 엔드포인트가 500으로 실패합니다.

### 2. 자동 배포
GitHub Actions를 통해 main 브랜치에 푸시하면 프론트엔드와 `api/` Azure Functions가 함께 배포됩니다.

## 프로젝트 구조

```
api/
├── src/
│   └── functions/
│       └── refineAnnouncement.ts  # 글 다듬기 함수
├── host.json                       # Functions 호스트 설정
├── package.json                    # 의존성 및 스크립트
├── tsconfig.json                   # TypeScript 설정
└── local.settings.json            # 로컬 환경 변수 (git 제외)
```

## 비용 관리

- GPT-4o-mini 사용으로 비용 효율적
- Azure Functions Consumption Plan 사용 (사용량 기반 과금)
- 월 100만 요청까지 무료

## 문제 해결

### CORS 오류
- `local.settings.json`의 CORS 설정 확인
- Azure Portal의 CORS 설정 확인

### OpenAI API 오류
- API 키가 올바른지 확인
- API 사용량 한도 확인
- 네트워크 연결 확인
