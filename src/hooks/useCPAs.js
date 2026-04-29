// src/hooks/useCPAs.js
import { useEffect, useState, useRef } from 'react';
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, deleteDoc, updateDoc,
  doc, serverTimestamp, Timestamp, getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX) { h = (h * MAX) / w; w = MAX; }
        if (h > MAX) { w = (w * MAX) / h; h = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadImagem(uid, cpaId, imagem, index) {
  if (typeof imagem === 'string' && imagem.startsWith('https://')) return imagem;
  let blob;
  if (typeof imagem === 'string' && imagem.startsWith('data:')) {
    const res = await fetch(imagem);
    blob = await res.blob();
  } else if (imagem instanceof File) {
    blob = await compressImage(imagem);
  } else {
    blob = imagem;
  }
  const storageRef = ref(storage, `comprovantes/${uid}/${cpaId}_${index}_${Date.now()}.jpg`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

// Busca se aprovação automática está ativa
async function getAprovacaoAutomatica() {
  try {
    const snap = await getDoc(doc(db, 'config', 'geral'));
    if (snap.exists()) {
      const data = snap.data();
      return data.aprovacaoAutomatica !== false; // default true
    }
  } catch {}
  return true;
}

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

  async function addCPA(casa, player = '', imagensBase64 = [], valorCPA = 0, valorDeposito = 0) {
    // Verifica se aprovação automática está ativa
    const autoAprovado = await getAprovacaoAutomatica();
    const status = autoAprovado ? 'aprovado' : 'pendente';

    const docRef = await addDoc(collection(db, 'cpas'), {
      uid,
      casa,
      player,
      valorCPA: Number(valorCPA),
      valorDeposito: Number(valorDeposito),
      comprovantes: [],
      status,
      createdAt: serverTimestamp(),
    });

    if (imagensBase64 && imagensBase64.length > 0) {
      const urls = await Promise.all(
        imagensBase64.map((img, i) => uploadImagem(uid, docRef.id, img, i))
      );
      await updateDoc(docRef, { comprovantes: urls });
    }

    return docRef;
  }

  async function removeCPA(id) {
    return deleteDoc(doc(db, 'cpas', id));
  }

  async function editCPA(id, data) {
    if (data.comprovantes && data.comprovantes.length > 0) {
      const urls = await Promise.all(
        data.comprovantes.map((img, i) => uploadImagem(uid, id, img, i))
      );
      data = { ...data, comprovantes: urls };
    }
    return updateDoc(doc(db, 'cpas', id), data);
  }

  async function aprovarCPA(id) {
    return updateDoc(doc(db, 'cpas', id), { status: 'aprovado', motivoRejeicao: null });
  }

  async function rejeitarCPA(id, motivo) {
    return updateDoc(doc(db, 'cpas', id), { status: 'rejeitado', motivoRejeicao: motivo });
  }

  return { cpas, loading, addCPA, removeCPA, editCPA, aprovarCPA, rejeitarCPA };
}
