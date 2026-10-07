import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config';

export interface NewspaperBranding {
  logoUrl: string;
  name: string;
  edition: string;
  tagline: string;
  updatedAt?: string;
}

const DEFAULT_BRANDING: NewspaperBranding = {
  logoUrl: '/assets/newspaper-logo.svg',
  name: 'THE BHARAT CHRONICLE',
  edition: 'Ranchi & National Edition',
  tagline: 'Truth • Integrity • Public Interest',
};

export async function getNewspaperBranding(): Promise<NewspaperBranding> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'branding'));
    if (snap.exists()) {
      return { ...DEFAULT_BRANDING, ...(snap.data() as Partial<NewspaperBranding>) };
    }
    return DEFAULT_BRANDING;
  } catch {
    return DEFAULT_BRANDING;
  }
}

export async function updateNewspaperBranding(branding: Partial<NewspaperBranding>): Promise<NewspaperBranding> {
  const merged = { ...DEFAULT_BRANDING, ...branding, updatedAt: new Date().toISOString() };
  await setDoc(doc(db, 'settings', 'branding'), merged, { merge: true });
  return merged;
}

export async function uploadOfficialLogo(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Official logo must be an image file (PNG, SVG, JPEG, WebP).');
  }

  const storageRef = ref(storage, `branding/official-newspaper-logo-${Date.now()}.${file.name.split('.').pop()}`);
  const task = await uploadBytesResumable(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(task.ref);

  await updateNewspaperBranding({ logoUrl: downloadUrl });
  return downloadUrl;
}
