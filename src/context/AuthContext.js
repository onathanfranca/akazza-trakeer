// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email, password, nome, tenantId) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      nome,
      email,
      role: 'afiliado',
      tenantId: tenantId || 'akazza-master',
      foto: null,
      createdAt: serverTimestamp(),
    });
    return cred;
  }

  async function logout() {
    await signOut(auth);
    setUserProfile(null);
  }

  async function fetchUserProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      setUserProfile(snap.data());
    }
  }

  async function updateProfile(uid, data) {
    await updateDoc(doc(db, 'users', uid), data);
    setUserProfile(prev => ({ ...prev, ...data }));
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const isSuperAdmin = userProfile?.role === 'superadmin';
  const isAdmin = userProfile?.role === 'admin' || isSuperAdmin;
  const tenantId = userProfile?.tenantId || 'akazza-master';

  const value = {
    currentUser,
    userProfile,
    login,
    register,
    logout,
    fetchUserProfile,
    updateProfile,
    isAdmin,
    isSuperAdmin,
    tenantId,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}