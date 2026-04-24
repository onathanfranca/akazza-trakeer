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
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  // valorAdmin, custoAdmin = valores do ponto de vista do admin
  // valorAfiliado, custoAfiliado = valores que o afiliado vê
  async function addCasa(nome, valorAdmin, custoAdmin, valorAfiliado, custoAfiliado) {
    const id = nome.toLowerCase().replace(/[\s/\\]+/g, '_');
    return setDoc(doc(db, 'casas', id), {
      nome,
      valor: Number(valorAdmin),        // compatibilidade legada
      custo: Number(custoAdmin),
      valorAdmin: Number(valorAdmin),
      custoAdmin: Number(custoAdmin),
      valorAfiliado: Number(valorAfiliado),
      custoAfiliado: Number(custoAfiliado),
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
