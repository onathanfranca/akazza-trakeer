// src/hooks/useCPAs.js
import { useEffect, useState, useRef } from 'react';
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, deleteDoc, updateDoc,
  doc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export function useCPAs(uid, dateFrom, dateTo, onNewCPA = null) {
  const [cpas, setCPAs] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const knownIds = useRef(new Set());

  useEffect(() => {
    if (!uid) return;
    isFirstLoad.current = true;
    knownIds.current = new Set();

    const from = Timestamp.fromDate(startOfDay(parseISO(dateFrom)));
    const to = Timestamp.fromDate(endOfDay(parseISO(dateTo)));

    const q = query(
      collection(db, 'cpas'),
      where('uid', '==', uid),
      where('createdAt', '>=', from),
      where('createdAt', '<=', to),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (isFirstLoad.current) {
        docs.forEach(d => knownIds.current.add(d.id));
        isFirstLoad.current = false;
      } else {
        snap.docChanges().forEach(change => {
          if (change.type === 'added' && !knownIds.current.has(change.doc.id)) {
            knownIds.current.add(change.doc.id);
            const cpa = { id: change.doc.id, ...change.doc.data() };
            if (onNewCPA) onNewCPA(cpa);
          }
        });
      }

      setCPAs(docs);
      setLoading(false);
    });

    return unsub;
  }, [uid, dateFrom, dateTo]);

  // valorCPA é congelado no momento do registro
  // valorDeposito é o valor informado pelo afiliado
  async function addCPA(casa, player = '', comprovantes = [], valorCPA = 0, valorDeposito = 0) {
    const data = {
      uid,
      casa,
      player,
      valorCPA: Number(valorCPA),       // congelado no momento do registro
      valorDeposito: Number(valorDeposito),
      createdAt: serverTimestamp(),
    };
    if (comprovantes && comprovantes.length > 0) data.comprovantes = comprovantes;
    return addDoc(collection(db, 'cpas'), data);
  }

  async function removeCPA(id) {
    return deleteDoc(doc(db, 'cpas', id));
  }

  async function editCPA(id, data) {
    return updateDoc(doc(db, 'cpas', id), data);
  }

  return { cpas, loading, addCPA, removeCPA, editCPA };
}
