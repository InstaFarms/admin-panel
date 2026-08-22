import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

if (typeof window !== 'undefined') {
  throw new Error('Firebase Admin SDK should only be used on the server side');
}

let adminApp: App | null = null;
let adminStorage: any = null;
let initializationPromise: Promise<void> | null = null;
let isInitialized = false;

function validateAndFormatPrivateKey(privateKey: string): string {
  if (!privateKey || typeof privateKey !== 'string') {
    throw new Error('Private key is required and must be a string');
  }

  // Remove surrounding quotes if present
  if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || 
      (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
    privateKey = privateKey.slice(1, -1);
  }

  // Replace escaped newlines with actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  // Trim whitespace from both ends
  privateKey = privateKey.trim();
  
  // Check if markers exist (case-insensitive check first)
  const hasBeginMarker = privateKey.includes('-----BEGIN PRIVATE KEY-----');
  const hasEndMarker = privateKey.includes('-----END PRIVATE KEY-----');
  
  if (!hasBeginMarker) {
    throw new Error('Private key must contain -----BEGIN PRIVATE KEY-----');
  }
  
  if (!hasEndMarker) {
    throw new Error('Private key must contain -----END PRIVATE KEY-----');
  }
  
  // Extract the key content between markers
  const beginIndex = privateKey.indexOf('-----BEGIN PRIVATE KEY-----');
  const endIndex = privateKey.indexOf('-----END PRIVATE KEY-----');
  
  if (beginIndex === -1 || endIndex === -1 || endIndex <= beginIndex) {
    throw new Error('Private key markers are in wrong order or missing');
  }
  
  // Reconstruct the key properly
  const header = '-----BEGIN PRIVATE KEY-----';
  const footer = '-----END PRIVATE KEY-----';
  const keyContent = privateKey.substring(beginIndex + header.length, endIndex).trim();
  
  // If key content doesn't have newlines, try to add them (64 chars per line is standard)
  let formattedContent = keyContent;
  if (!keyContent.includes('\n') && keyContent.length > 64) {
    // Try to break into 64-char lines (but this is a fallback, ideally it should already have newlines)
    formattedContent = keyContent.match(/.{1,64}/g)?.join('\n') || keyContent;
  }
  
  // Reconstruct the full key
  privateKey = `${header}\n${formattedContent}\n${footer}`;
  
  // Clean up multiple consecutive newlines (but keep at least one)
  privateKey = privateKey.replace(/\n{3,}/g, '\n\n');
  
  // Final trim
  privateKey = privateKey.trim();
  
  // Final validation - ensure it still has the required markers
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Private key validation failed: missing BEGIN marker after formatting');
  }
  
  if (!privateKey.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Private key validation failed: missing END marker after formatting');
  }
  
  // Ensure it ends with the footer (allowing for trailing newline)
  const trimmedEnd = privateKey.trimEnd();
  if (!trimmedEnd.endsWith('-----END PRIVATE KEY-----')) {
    throw new Error('Private key must end with -----END PRIVATE KEY-----');
  }
  
  return privateKey;
}

async function initializeFirebaseAdmin(): Promise<void> {
  if (isInitialized && adminApp && adminStorage) {
    return;
  }

  try {
    const requiredEnvVars = {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    };

    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        throw new Error(`${key} is not set in environment variables`);
      }
    }

    let privateKey: string;
    try {
      privateKey = validateAndFormatPrivateKey(process.env.FIREBASE_PRIVATE_KEY!);
    } catch (keyError: any) {
      // Provide helpful debugging information
      const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
      const keyLength = rawKey.length;
      const hasBeginMarker = rawKey.includes('-----BEGIN PRIVATE KEY-----');
      const hasEndMarker = rawKey.includes('-----END PRIVATE KEY-----');
      const hasNewlines = rawKey.includes('\\n') || rawKey.includes('\n');
      
      console.error('Private key validation failed:', {
        error: keyError.message,
        keyLength,
        hasBeginMarker,
        hasEndMarker,
        hasNewlines,
        firstChars: rawKey.substring(0, 50),
        lastChars: rawKey.substring(Math.max(0, rawKey.length - 50)),
      });
      
      throw new Error(
        `Invalid Firebase private key format: ${keyError.message}. ` +
        `Please ensure your FIREBASE_PRIVATE_KEY in .env includes the full key with \\n characters. ` +
        `Example format: "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"`
      );
    }

    // Check if admin app already exists
    const existingApps = getApps();
    const existingAdminApp = existingApps.find(app => app.name === 'admin');

    if (existingAdminApp) {
      adminApp = existingAdminApp;
    } else {
      const serviceAccountConfig = {
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: privateKey,
      };
      try {
        cert(serviceAccountConfig);
      } catch (credError) {
        console.error(' Service account credential validation failed:', credError);
        throw new Error(`Invalid service account configuration: ${credError}`);
      }

      // Initialize Firebase Admin app
      adminApp = initializeApp({
        credential: cert(serviceAccountConfig),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!.replace('gs://', '')
      }, 'admin');
    }

    // Initialize storage if not already done
    if (!adminStorage) {
      adminStorage = getStorage(adminApp);
      // Test storage access
      try {
        const bucket = adminStorage.bucket();
        await bucket.getMetadata();
      } catch (storageError) {
        console.error(' Storage bucket access test failed:', storageError);
      }
    }

    isInitialized = true;

  } catch (error) {
    console.error(' Firebase Admin initialization error:', error);

    adminApp = null;
    adminStorage = null;
    isInitialized = false;

    throw error;
  }
}

function getFirebaseAdmin(): Promise<{ adminApp: App, adminStorage: any }> {
  if (!initializationPromise) {
    initializationPromise = initializeFirebaseAdmin();
  }

  return initializationPromise.then(() => {
    if (!adminApp || !adminStorage) {
      throw new Error('Firebase Admin initialization failed');
    }
    return { adminApp, adminStorage };
  });
}

if (!isInitialized) {
  initializeFirebaseAdmin().catch(error => {
    console.error('Failed to initialize Firebase Admin:', error);
  });
}

export { adminApp, adminStorage, getFirebaseAdmin };

