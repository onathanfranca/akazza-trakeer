// src/utils/logs.js
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function registrarLog(tenantId, { uid, nome, acao, detalhe = '' }) {
  try {
    await addDoc(collection(db, 'logs', tenantId, 'entries'), {
      uid,
      nome,
      acao,
      detalhe,
      criadoEm: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Erro ao registrar log:', e);
  }
}
