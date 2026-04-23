// src/hooks/useAllCPAs.js
// Hook admin — busca todos os CPAs de todos os afiliados em tempo real
import { useEffect, useState } from 'react';
import {
  collection, query, where, orderBy,
  onSnapshot, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export function useAllCPAs(dateFrom, dateTo) {
  const [cpas, setCPAs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const from = Timestamp.fromDate(startOfDay(parseISO(dateFrom)));
    const to = Timestamp.fromDate(endOfDay(parseISO(dateTo)));

    const q = query(
      collection(db, 'cpas'),
      where('createdAt', '>=', from),
      where('createdAt', '<=', to),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setCPAs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsub;
  }, [dateFrom, dateTo]);

  return { cpas, loading };
}
