// Firebase Admin SDK 초기화
import * as admin from 'firebase-admin';

let initialized = false;

export function initializeFirebase(): void {
  if (initialized) return;

  // 환경변수에서 서비스 계정 정보 가져오기
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Firebase 환경변수가 설정되지 않았습니다.');
    throw new Error('Firebase 환경변수가 설정되지 않았습니다.');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  initialized = true;
  console.log('Firebase Admin SDK 초기화 완료');
}

export function getFirestore(): admin.firestore.Firestore {
  if (!initialized) {
    initializeFirebase();
  }
  return admin.firestore();
}

export { admin };
