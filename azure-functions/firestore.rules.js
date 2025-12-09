// Firestore 보안 규칙 (프로덕션용)
// Firebase Console > Firestore Database > Rules 에 붙여넣기

/*
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===== 패치노트 컬렉션 =====
    match /patchnotes/{patchnoteId} {
      
      // 읽기 규칙:
      // - 발행된(published) public 패치노트는 누구나 읽기 가능
      // - 발행된 teacher 패치노트도 누구나 읽기 가능 (프론트엔드에서 권한 체크)
      // - 초안(draft)은 읽기 불가
      allow read: if resource.data.status == 'published';
      
      // 쓰기 규칙:
      // - 클라이언트에서 직접 쓰기 불가
      // - Azure Functions (Firebase Admin SDK)만 쓰기 가능
      allow write: if false;
    }
    
    // ===== 기본 규칙: 다른 모든 컬렉션 접근 차단 =====
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
*/

// ============================================================
// 위 규칙 설명:
// ============================================================
// 
// 1. 읽기 (read):
//    - status == 'published'인 문서만 클라이언트에서 읽기 가능
//    - 초안(draft) 상태의 패치노트는 클라이언트에서 조회 불가
//    - 하지만 현재 API를 통해 조회하므로 이 규칙은 추가 보안 레이어
//
// 2. 쓰기 (write):
//    - 모든 쓰기 작업 차단 (allow write: if false)
//    - Azure Functions의 Firebase Admin SDK는 보안 규칙을 우회하므로
//      서버에서만 쓰기 작업 가능
//
// 3. 기본 규칙:
//    - patchnotes 컬렉션 외 다른 컬렉션은 모든 접근 차단
//
// ============================================================
// Firebase Admin SDK가 보안 규칙을 우회하는 이유:
// ============================================================
// 
// Firebase Admin SDK는 서비스 계정을 사용하여 인증되며,
// 보안 규칙(Security Rules)을 완전히 우회합니다.
// 이는 서버 측 애플리케이션이 전체 데이터베이스에 
// 무제한 접근할 수 있도록 설계된 것입니다.
//
// 따라서:
// - Azure Functions (Admin SDK 사용) → 모든 CRUD 가능
// - 클라이언트 (Web SDK) → 보안 규칙에 따라 제한됨
//
// ============================================================
