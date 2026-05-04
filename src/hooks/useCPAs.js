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

async function uploadArquivo(uid, cpaId, arquivo, index) {
  // URL existente — retorna direto
  if (typeof arquivo === 'string' && arquivo.startsWith('https://')) return arquivo;

  let blob;
  let extensao = 'jpg';
  let tipo = 'image/jpeg';

  if (arquivo instanceof File) {
    if (arquivo.type === 'application/pdf') {
      blob = arquivo;
      extensao = 'pdf';
      tipo = 'application/pdf';
    } else {
      blob = await compressImage(arquivo);
    }
  } else if (typeof arquivo === 'string' && arquivo.startsWith('data:')) {
    const res = await fetch(arquivo);
    blob = await res.blob();
    if (arquivo.startsWith('data:application/pdf')) { extensao = 'pdf'; tipo = 'application/pdf'; }
  } else {
    blob = arquivo;
  }

  const storageRef = ref(storage, `comprovantes/${uid}/${cpaId}_${index}_${Date.now()}.${extensao}`);
  await uploadBytes(storageRef, blob, { contentType: tipo });
  const url = await getDownloadURL(storageRef);
  // Salva metadado do tipo junto com a URL
  return { url, tipo: extensao === 'pdf' ? 'pdf' : 'imagem' };
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
      const resultados = await Promise.all(
        imagensBase64.map((img, i) => uploadArquivo(uid, docRef.id, img, i))
      );
      await updateDoc(docRef, { comprovantes: resultados });
    }

    return docRef;
  }

  async function removeCPA(id) {
    return deleteDoc(doc(db, 'cpas', id));
  }

  async function editCPA(id, data) {
    if (data.comprovantes && data.comprovantes.length > 0) {
      const resultados = await Promise.all(
        data.comprovantes.map((item, i) => {
          // Se já for objeto {url, tipo} salvo, retorna direto
          if (item && typeof item === 'object' && item.url) return Promise.resolve(item);
          return uploadArquivo(uid, id, item, i);
        })
      );
      data = { ...data, comprovantes: resultados };
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
