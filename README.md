# Qvick Web Demo

온라인 기숙사 관리 플랫폼 - 프론트엔드

## 🚀 기술 스택

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 7.1.12
- **Routing**: React Router DOM
- **State Management**: TanStack React Query (서버 상태)
- **HTTP Client**: Axios
- **Styling**: CSS Modules
- **Design**: Figma MCP 연동

## 📦 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

## 🔐 인증 시스템

### 자동 토큰 관리
- **Access Token**: localStorage에 저장
- **Refresh Token**: localStorage에 저장
- **자동 갱신**: 401 에러 시 자동으로 토큰 재발급
- **보호된 라우트**: 로그인하지 않은 사용자는 자동으로 /login으로 리다이렉트

### API 인터셉터
- **Request**: 모든 요청에 자동으로 Authorization Bearer 토큰 추가
- **Response**: 401 에러 시 자동 토큰 재발급 → 실패 시 로그인 페이지로 이동

## 🔌 API 연동 현황

### ✅ 완료된 페이지

#### 1. 로그인 (/login)
- POST /auth/login - 로그인
- POST /auth/reissue - 토큰 재발급

#### 2. 대시보드 (/)
- GET /teacher/students - 전체 학생 수
- GET /teacher/attendances - 출석 통계
- GET /announcements - 공지사항 수

#### 3. 출석 확인 (/check)
- GET /teacher/students - 학생 목록
- GET /teacher/attendances - 출석 데이터
- PATCH /teacher/students/{id} - 학생 정보 수정
- GET /teacher/attendances/export - 엑셀 다운로드

#### 4. 일정 관리 (/schedule)
- GET /teacher/attendance/schedules/calendar/month - 월별 스케줄
- POST /teacher/attendance/schedules - 스케줄 생성
- PATCH /teacher/attendance/schedules/date - 스케줄 수정
- DELETE /teacher/attendance/schedules - 스케줄 삭제

#### 5. 공지사항 (/notice)
- GET /announcements - 공지사항 목록

#### 6. 헤더
- GET /users/my - 사용자 정보
- 로그아웃 기능

## 🌐 API 서버

- **개발**: https://devapi.qvick.xyz
- **프로덕션**: https://api.qvick.xyz

## 👥 개발자

Team C0nnect
