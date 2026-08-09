// Firebase Admin SDK 초기화
import { cert, initializeApp } from 'firebase-admin/app';
import {
  FieldValue,
  getFirestore as getAdminFirestore,
  Timestamp,
  type DocumentData,
  type Firestore,
} from 'firebase-admin/firestore';

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

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  initialized = true;
  console.log('Firebase Admin SDK 초기화 완료');
}

export function getFirestore(): Firestore {
  if (!initialized) {
    initializeFirebase();
  }
  return getAdminFirestore();
}

export { FieldValue, Timestamp };
export type { DocumentData };
