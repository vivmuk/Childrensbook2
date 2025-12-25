import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

export function getAdminApp() {
    if (getApps().length) {
        return getApp();
    }

    // Only initialize if we have credentials
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        // In development or build time without keys, we might want to skip or throw
        // For now, let's throw to make it obvious keys are missing
        throw new Error('Missing Firebase Admin Credential Env Vars');
    }

    return initializeApp({
        credential: cert(serviceAccount),
    });
}

export function getAdminDb() {
    const app = getAdminApp();
    return getFirestore(app);
}
