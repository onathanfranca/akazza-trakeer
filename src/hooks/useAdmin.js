// src/hooks/useAdmin.js
import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, doc, updateDoc,
  deleteDoc, setDoc, addDoc, query, orderBy,
  where, Timestamp
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

// ─── Fechamentos ─────────────────────────────────────────────────────────────
export function useFechamentos(uid = null) {
  const [fechamentos, setFechamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q;
    if (uid) {
      q = query(
        collection(db, 'fechamentos'),
        where('uid', '==', uid),
        orderBy('criadoEm', 'desc')
      );
    } else {
      q = query(
        collection(db, 'fechamentos'),
        orderBy('criadoEm', 'desc')
      );
    }
    const unsub = onSnapshot(q, (snap) => {
      setFechamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  async function criarFechamento({ uid, nomeAfiliado, dateFrom, dateTo, totalCPAs, faturamento, valorPago, observacao }) {
    return addDoc(collection(db, 'fechamentos'), {
      uid,
      nomeAfiliado,
      dateFrom,
      dateTo,
      totalCPAs: Number(totalCPAs),
      faturamento: Number(faturamento),
      valorPago: Number(valorPago),
      observacao: observacao || '',
      pago: true,
      criadoEm: Timestamp.now(),
    });
  }

  async function deletarFechamento(id) {
    return deleteDoc(doc(db, 'fechamentos', id));
  }

  return { fechamentos, loading, criarFechamento, deletarFechamento };
}
