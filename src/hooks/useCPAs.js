// src/hooks/useCPAs.js
import { useEffect, useState } from 'react';
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, deleteDoc, updateDoc,
  doc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export function useCPAs(uid, dateFrom, dateTo) {
  const [cpas, setCPAs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

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
      setCPAs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsub;
  }, [uid, dateFrom, dateTo]);

  async function addCPA(casa, player = '', comprovante = null) {
    const data = {
      uid,
      casa,
      player,
      createdAt: serverTimestamp(),
    };
    if (comprovante) data.comprovante = comprovante;
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
