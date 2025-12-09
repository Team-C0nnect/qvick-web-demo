// Firebase Admin SDK 초기화
import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore;

export function initializeFirebase(): admin.firestore.Firestore {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase 환경변수가 설정되지 않았습니다.');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  db = admin.firestore();
  return db;
}

export function getFirestore(): admin.firestore.Firestore {
  if (!db) {
    return initializeFirebase();
  }
  return db;
}

export { admin };
