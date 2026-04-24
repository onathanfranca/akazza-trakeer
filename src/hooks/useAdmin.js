// src/hooks/useAdmin.js
import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, doc, updateDoc,
  deleteDoc, setDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

export function useUsers() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });
    return unsub;
  }, []);
  async function updateRole(uid, role) { return updateDoc(doc(db, 'users', uid), { role }); }
  async function removeUser(uid) { return deleteDoc(doc(db, 'users', uid)); }
  return { users, updateRole, removeUser };
}

export function useCasas() {
  const [casas, setCasas] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'casas'), (snap) => {
      setCasas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  async function saveCasa(id, data) {
    return setDoc(doc(db, 'casas', id), data, { merge: true });
  }

  async function addCasa(nome, valorAdmin, custoAdmin, valorAfiliado, custoAfiliado, link = '') {
    const id = nome.toLowerCase().replace(/[\s/\\]+/g, '_');
    return setDoc(doc(db, 'casas', id), {
      nome,
      valor: Number(valorAdmin),
      custo: Number(custoAdmin),
      valorAdmin: Number(valorAdmin),
      custoAdmin: Number(custoAdmin),
      valorAfiliado: Number(valorAfiliado),
      custoAfiliado: Number(custoAfiliado),
      link: link || '',
    });
  }

  async function removeCasa(id) { return deleteDoc(doc(db, 'casas', id)); }

  return { casas, saveCasa, addCasa, removeCasa };
}

export function useConfig() {
  const [config, setConfig] = useState({ metaDiaria: 50 });
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'geral'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });
    return unsub;
  }, []);
  async function saveConfig(data) { return setDoc(doc(db, 'config', 'geral'), data, { merge: true }); }
  return { config, saveConfig };
}
