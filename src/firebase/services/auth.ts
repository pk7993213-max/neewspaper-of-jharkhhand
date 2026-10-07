import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, query, limit } from 'firebase/firestore';
import { auth, db } from '../config';
import { StaffUser, UserRole } from '../../types';

export async function syncUserProfile(user: FirebaseUser): Promise<StaffUser> {
  const tokenResult = await user.getIdTokenResult(true);
  const claimRole = tokenResult.claims.role as UserRole | undefined;

  const adminSnap = await getDoc(doc(db, 'admins', user.uid));
  const isDesignatedAdmin = adminSnap.exists() || claimRole === 'admin';

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  let role: UserRole = 'reporter';

  if (isDesignatedAdmin) {
    role = 'admin';
  } else if (claimRole) {
    role = claimRole;
  } else if (userSnap.exists() && userSnap.data().role) {
    role = userSnap.data().role as UserRole;
  } else {
    // Check if system has any admins at all (Bootstrap procedure)
    const anyAdminsSnap = await getDocs(query(collection(db, 'admins'), limit(1)));
    if (anyAdminsSnap.empty) {
      // First user ever in the system gets bootstrapped as initial administrator
      role = 'admin';
      await setDoc(doc(db, 'admins', user.uid), {
        uid: user.uid,
        email: user.email || '',
        role: 'admin',
        bootstrappedAt: new Date().toISOString(),
      });
    }
  }

  const staffData: StaffUser = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'Staff Journalist',
    role,
    photoURL: user.photoURL || '',
    createdAt: userSnap.exists() ? userSnap.data().createdAt : new Date().toISOString(),
  };

  // Safe update: don't overwrite if role is higher in DB
  await setDoc(userRef, staffData, { merge: true });

  return staffData;
}

export async function loginWithGoogle(): Promise<StaffUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return await syncUserProfile(result.user);
}

export async function loginWithEmail(email: string, pass: string): Promise<StaffUser> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return await syncUserProfile(result.user);
}

export async function registerWithEmail(email: string, pass: string, name: string): Promise<StaffUser> {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (name.trim()) {
    await updateProfile(result.user, { displayName: name.trim() });
  }
  return await syncUserProfile(result.user);
}

export async function logoutStaff(): Promise<void> {
  await fbSignOut(auth);
}

export async function getStaffProfile(uid: string): Promise<StaffUser | null> {
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) return null;
    return userSnap.data() as StaffUser;
  } catch {
    return null;
  }
}
