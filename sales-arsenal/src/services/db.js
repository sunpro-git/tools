import { db } from '../firebase.js';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  onSnapshot, arrayUnion, arrayRemove, increment, writeBatch,
} from 'firebase/firestore';

export const seedWeaponsIfEmpty = async () => {
  const col = collection(db, 'weapons');
  const snap = await getDocs(col);
  if (!snap.empty) return;

  const { INITIAL_WEAPONS } = await import('../data.js');
  const batch = writeBatch(db);
  INITIAL_WEAPONS.forEach(({ id, ...data }) => {
    batch.set(doc(col, String(id)), data);
  });
  await batch.commit();
};

export const subscribeToWeapons = (callback) => {
  return onSnapshot(collection(db, 'weapons'), (snap) => {
    const weapons = snap.docs
      .map((d) => ({ ...d.data(), id: d.id }))
      .sort((a, b) => a.title?.localeCompare(b.title, 'ja'));
    callback(weapons);
  });
};

export const toggleLikeInDb = async (weaponId, userId, isCurrentlyLiked) => {
  await Promise.all([
    updateDoc(doc(db, 'weapons', String(weaponId)), {
      likes: increment(isCurrentlyLiked ? -1 : 1),
    }),
    updateDoc(doc(db, 'users', userId), {
      likedWeapons: isCurrentlyLiked ? arrayRemove(weaponId) : arrayUnion(weaponId),
    }),
  ]);
};

export const completeQuizInDb = async (weaponId, userId, userName) => {
  const ref = doc(db, 'weapons', String(weaponId));
  const snap = await getDoc(ref);
  const alreadyCompleted = snap.data()?.completedBy?.some((u) => u.id === userId) ?? false;
  if (!alreadyCompleted) {
    const today = new Date().toISOString().split('T')[0];
    await updateDoc(ref, {
      completedBy: arrayUnion({ id: userId, name: userName, date: today }),
      'metrics.understood': increment(1),
    });
  }
  return { alreadyCompleted };
};

export const getUserDoc = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

export const upsertUserDoc = (uid, data) =>
  setDoc(doc(db, 'users', uid), data, { merge: true });

export const saveTodoProgress = (userId, todoProgress) =>
  updateDoc(doc(db, 'users', userId), { todoProgress });

// 武器CRUD
export const addWeapon = (weaponData) =>
  addDoc(collection(db, 'weapons'), weaponData);

export const updateWeapon = (weaponId, weaponData) =>
  updateDoc(doc(db, 'weapons', String(weaponId)), weaponData);

export const deleteWeapon = (weaponId) =>
  deleteDoc(doc(db, 'weapons', String(weaponId)));

// スタッフ管理
export const fetchAllUsers = async () => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));
};

export const saveStaff = (userId, data) =>
  setDoc(doc(db, 'users', userId), data, { merge: true });

export const deleteStaff = (userId) =>
  deleteDoc(doc(db, 'users', userId));
