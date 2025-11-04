# 글 다듬기 기능 설정 가이드

## 개요
OpenAI GPT-4o-mini를 사용하여 공지사항 내용을 자동으로 다듬어주는 기능입니다.

## 🚀 빠른 시작

### 1. OpenAI API 키 발급
1. [OpenAI Platform](https://platform.openai.com/) 접속
2. API Keys 메뉴에서 새 API 키 생성
3. 생성된 키를 안전하게 보관

### 2. Azure Static Web App 환경 변수 설정

#### Azure Portal에서 설정:
1. Azure Portal에 로그인
2. Static Web App 리소스로 이동
3. 왼쪽 메뉴에서 **Configuration** 선택
4. **Application settings** 탭에서 **+ Add** 클릭
5. 다음 환경 변수 추가:
   - Name: `OPENAI_API_KEY`
   - Value: `sk-your-actual-openai-api-key`
6. **Save** 클릭

### 3. 로컬 개발 환경 설정 (선택사항)

로컬에서 테스트하려면:

```bash
# API 디렉토리로 이동
cd api

# 의존성 설치
npm install

# Azure Functions Core Tools 설치 (한 번만)
# macOS:
brew tap azure/functions
brew install azure-functions-core-tools@4

# Windows:
# choco install azure-functions-core-tools

# local.settings.json 파일 수정
# OPENAI_API_KEY를 실제 키로 변경

# 빌드 및 실행
npm run build
npm start
```

로컬에서는 `http://localhost:7071/api/refineAnnouncement`로 접속됩니다.

### 4. 배포

GitHub에 push하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "Add AI refine feature"
git push origin main
```

GitHub Actions가 자동으로:
- 프론트엔드 빌드
- API 빌드
- Azure에 배포

를 수행합니다.

## 📱 사용 방법

1. 공지사항 작성 모달 열기
2. 내용 입력
3. **✨ 글 다듬기** 버튼 클릭
4. AI가 내용을 다듬어주면 자동으로 미리보기 모드로 전환
5. 결과 확인 후 필요시 수정
6. **작성 완료** 버튼으로 저장

## 🎯 기능 특징

### AI가 수행하는 작업:
- ✅ 공식적이고 명확한 어조로 변환
- ✅ 마크다운 형식 활용 (제목, 목록, 강조)
- ✅ 중요 정보 **굵게** 표시
- ✅ 날짜, 시간, 장소 강조
- ✅ 문단 구조 정리
- ✅ 어법 및 맞춤법 교정
- ✅ 적절한 이모지 추가 (선택적)

### 주의사항:
- 원본 의미는 보존됩니다
- 가독성과 전달력이 향상됩니다
- 처리 시간: 보통 3-10초

## 💰 비용

### OpenAI API (GPT-4o-mini)
- 입력: $0.150 / 1M tokens
- 출력: $0.600 / 1M tokens
- 평균 공지사항 다듬기: 약 300-500 토큰 (입력+출력)
- **예상 비용**: 건당 약 $0.0003 (0.4원)

### Azure Functions
- Consumption Plan 사용
- 월 100만 요청까지 무료
- 초과 시: $0.20 / 백만 실행

**월 1000회 사용 시 예상 비용: 약 500원**

## 🔒 보안

- API 키는 서버 측에서만 사용 (클라이언트에 노출 안 됨)
- HTTPS를 통한 안전한 통신
- Azure Static Web Apps의 보안 기능 활용

## 🐛 문제 해결

### "글 다듬기에 실패했습니다"
- Azure Portal의 Configuration에서 OPENAI_API_KEY 확인
- OpenAI API 키가 유효한지 확인
- OpenAI 계정의 잔액 및 사용량 한도 확인

### 로컬에서 작동하지 않음
- `api/local.settings.json` 파일 확인
- Azure Functions Core Tools 설치 확인
- `npm run build` 실행 후 `npm start` 재시도

### 배포 후 작동하지 않음
- GitHub Actions 로그 확인
- Azure Portal의 Configuration에서 환경 변수 확인
- Azure Static Web App의 Functions 탭에서 로그 확인

## 📚 추가 리소스

- [OpenAI API 문서](https://platform.openai.com/docs)
- [Azure Functions 문서](https://learn.microsoft.com/azure/azure-functions/)
- [Azure Static Web Apps 문서](https://learn.microsoft.com/azure/static-web-apps/)
