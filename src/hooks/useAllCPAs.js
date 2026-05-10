// src/hooks/useAllCPAs.js
import { useEffect, useState, useRef } from 'react';
import {
  collection, query, where, orderBy,
  onSnapshot, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export function useAllCPAs(dateFrom, dateTo, tenantId, onNewCPA = null) {
  const [cpas, setCPAs] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const knownIds = useRef(new Set());

  useEffect(() => {
    if (!tenantId) return;
    isFirstLoad.current = true;
    knownIds.current = new Set();

    const from = Timestamp.fromDate(startOfDay(parseISO(dateFrom)));
    const to = Timestamp.fromDate(endOfDay(parseISO(dateTo)));

    const q = query(
      collection(db, 'cpas'),
      where('tenantId', '==', tenantId),
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
  }, [dateFrom, dateTo, tenantId]);

  return { cpas, loading };
}