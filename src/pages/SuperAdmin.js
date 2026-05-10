// src/pages/SuperAdmin.js
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format } from 'date-fns';

function fmtTs(ts) {
  if (!ts) return '--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'dd/MM/yyyy');
}

export default function SuperAdmin() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tenants'), snap => {
      setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  async function togglePlano(id, planoAtual) {
    setSalvando(id);
    try {
      await updateDoc(doc(db, 'tenants', id), {
        plano: planoAtual === 'ativo' ? 'inativo' : 'ativo'
      });
    } catch (e) { console.error(e); }
    setSalvando('');
  }

  return (
    <div className="fade-in">
      <div className="section-title">🌐 Super Admin — Tenants</div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /><span className="loading-text">Carregando...</span></div>
      ) : tenants.length === 0 ? (
        <div className="empty"><div className="empty-icon">🏢</div>Nenhum tenant cadastrado.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tenants.map(t => (
            <div key={t.id} style={{
              background: 'var(--card)', borderRadius: 14, padding: '16px 18px',
              border: `1px solid ${t.plano === 'ativo' ? 'rgba(26,170,110,0.2)' : 'rgba(229,57,53,0.2)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{t.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    ID: {t.id} • Criado em {fmtTs(t.criadoEm)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
                    background: t.plano === 'ativo' ? 'rgba(26,170,110,0.15)' : 'rgba(229,57,53,0.15)',
                    color: t.plano === 'ativo' ? 'var(--green)' : 'var(--red)',
                    border: `1px solid ${t.plano === 'ativo' ? 'var(--green)' : 'var(--red)'}`,
                  }}>
                    {t.plano === 'ativo' ? '✅ Ativo' : '🔒 Inativo'}
                  </span>
                  <button
                    onClick={() => togglePlano(t.id, t.plano)}
                    disabled={salvando === t.id}
                    style={{
                      padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', border: '1.5px solid var(--border)',
                      background: 'var(--glass-bg)', color: 'var(--text)',
                      transition: 'all .15s',
                    }}
                  >
                    {salvando === t.id ? '...' : t.plano === 'ativo' ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}