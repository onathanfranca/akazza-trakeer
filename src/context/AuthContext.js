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
  const [tenantData, setTenantData] = useState(null);
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
    setTenantData(null);
  }

  async function fetchUserProfile(uid) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return;

      const profile = snap.data();
      setUserProfile(profile);

      if (profile.role === 'superadmin') return;

      if (profile.tenantId) {
        try {
          const tenantSnap = await getDoc(doc(db, 'tenants', profile.tenantId));
          if (tenantSnap.exists()) {
            setTenantData(tenantSnap.data());
          } else {
            setTenantData({ plano: 'pendente' });
          }
        } catch (tenantErr) {
          console.warn('Erro ao buscar tenant:', tenantErr);
          setTenantData({ plano: 'pendente' });
        }
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
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
        setTenantData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const isSuperAdmin = userProfile?.role === 'superadmin';
  const isAdmin = userProfile?.role === 'admin' || isSuperAdmin;
  const tenantId = userProfile?.tenantId || 'akazza-master';

  // ── Lógica de trial ────────────────────────────────────────────────────────
  const agora = new Date();

  // trialExpira pode vir como Timestamp do Firestore ou como Date
  const trialExpiraRaw = tenantData?.trialExpira;
  const trialExpira = trialExpiraRaw?.toDate
    ? trialExpiraRaw.toDate()          // Firestore Timestamp
    : trialExpiraRaw instanceof Date
      ? trialExpiraRaw                 // Date normal (cadastro recém-feito)
      : null;

  const emTrial = Boolean(trialExpira && trialExpira > agora);

  const diasRestantesTrial = emTrial
    ? Math.ceil((trialExpira - agora) / (1000 * 60 * 60 * 24))
    : 0;

  // Tenant ativo = plano pago OU dentro do período de trial
  const tenantAtivo = isSuperAdmin || tenantData?.plano === 'ativo' || emTrial;
  // ──────────────────────────────────────────────────────────────────────────

  const value = {
    currentUser,
    userProfile,
    tenantData,
    login,
    register,
    logout,
    fetchUserProfile,
    updateProfile,
    isAdmin,
    isSuperAdmin,
    tenantId,
    tenantAtivo,
    // trial
    emTrial,
    diasRestantesTrial,
    trialExpira,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}