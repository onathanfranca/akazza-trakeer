// src/hooks/useAdmin.js
import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, doc, updateDoc,
  deleteDoc, setDoc, addDoc, query, orderBy,
  where, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

export function useUsers(tenantId) {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    if (!tenantId) return;
    const q = query(
      collection(db, 'users'),
      where('tenantId', '==', tenantId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });
    return unsub;
  }, [tenantId]);
  async function updateRole(uid, role) { return updateDoc(doc(db, 'users', uid), { role }); }
  async function removeUser(uid) { return deleteDoc(doc(db, 'users', uid)); }
  return { users, updateRole, removeUser };
}

export function useCasas(tenantId) {
  const [casas, setCasas] = useState([]);
  useEffect(() => {
    if (!tenantId) return;

    // Busca casas do tenant
    const qTenant = query(
      collection(db, 'casas'),
      where('tenantId', '==', tenantId)
    );
    // Busca casas globais (superbet etc)
    const qGlobal = query(
      collection(db, 'casas'),
      where('tenantId', '==', 'global')
    );

    let tenantCasas = [];
    let globalCasas = [];

    const merge = () => {
      // casas do tenant sobrepõem globais com mesmo id
      const ids = new Set(tenantCasas.map(c => c.id));
      const merged = [
        ...tenantCasas,
        ...globalCasas.filter(c => !ids.has(c.id))
      ];
      setCasas(merged);
    };

    const unsubTenant = onSnapshot(qTenant, (snap) => {
      tenantCasas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      merge();
    });

    const unsubGlobal = onSnapshot(qGlobal, (snap) => {
      globalCasas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      merge();
    });

    return () => { unsubTenant(); unsubGlobal(); };
  }, [tenantId]);

  async function saveCasa(id, data) {
    return setDoc(doc(db, 'casas', id), data, { merge: true });
  }

  async function addCasa(nome, valorAdmin, custoAdmin, valorAfiliado, custoAfiliado, link = '') {
    const id = nome.toLowerCase().replace(/[\s/\\]+/g, '_') + '_' + tenantId;
    return setDoc(doc(db, 'casas', id), {
      tenantId,
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

export function useConfig(tenantId) {
  const [config, setConfig] = useState({ metaDiaria: 50 });
  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(doc(db, 'config', tenantId), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });
    return unsub;
  }, [tenantId]);
  async function saveConfig(data) {
    return setDoc(doc(db, 'config', tenantId), data, { merge: true });
  }
  return { config, saveConfig };
}

export function useFechamentos(tenantId, uid = null) {
  const [fechamentos, setFechamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    let q;
    if (uid) {
      q = query(
        collection(db, 'fechamentos'),
        where('tenantId', '==', tenantId),
        where('uid', '==', uid),
        orderBy('criadoEm', 'desc')
      );
    } else {
      q = query(
        collection(db, 'fechamentos'),
        where('tenantId', '==', tenantId),
        orderBy('criadoEm', 'desc')
      );
    }
    const unsub = onSnapshot(q, (snap) => {
      setFechamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [tenantId, uid]);

  async function criarFechamento({ uid, nomeAfiliado, dateFrom, dateTo, totalCPAs, faturamento, valorPago, observacao }) {
    return addDoc(collection(db, 'fechamentos'), {
      uid,
      tenantId,
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