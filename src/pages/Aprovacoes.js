// src/pages/Aprovacoes.js
import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { registrarLog } from '../utils/logs';
import { ComprovanteThumbnail, ComprovanteViewer, getComprovantesNormalizados } from '../components/Comprovantes';
import { format } from 'date-fns';

function formatTime(ts) {
  if (!ts) return '--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'dd/MM HH:mm');
}
function fmtVal(n) { return `R$ ${Number(Math.abs(n || 0)).toLocaleString('pt-BR')}`; }

export default function Aprovacoes({ casas, users, tenantId }) {
  const { showToast } = useToast();
  const { currentUser, userProfile } = useAuth();
  const [cpas, setCpas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('pendente');
  const [viewingItem, setViewingItem] = useState(null);
  const [rejeitandoId, setRejeitandoId] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [pendentesCount, setPendentesCount] = useState(0);
  const [aprovadosCount, setAprovadosCount] = useState(0);
  const [rejeitadosCount, setRejeitadosCount] = useState(0);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    const q = query(
      collection(db, 'cpas'),
      where('tenantId', '==', tenantId),
      where('status', '==', filtro),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setCpas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [filtro, tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    const q1 = query(collection(db, 'cpas'), where('tenantId', '==', tenantId), where('status', '==', 'pendente'));
    const q2 = query(collection(db, 'cpas'), where('tenantId', '==', tenantId), where('status', '==', 'aprovado'));
    const q3 = query(collection(db, 'cpas'), where('tenantId', '==', tenantId), where('status', '==', 'rejeitado'));
    const u1 = onSnapshot(q1, s => setPendentesCount(s.size));
    const u2 = onSnapshot(q2, s => setAprovadosCount(s.size));
    const u3 = onSnapshot(q3, s => setRejeitadosCount(s.size));
    return () => { u1(); u2(); u3(); };
  }, [tenantId]);

  async function aprovar(id) {
    setSalvando(true);
    try {
      const cpa = cpas.find(c => c.id === id);
      await updateDoc(doc(db, 'cpas', id), { status: 'aprovado', motivoRejeicao: null });
      await registrarLog(tenantId, {
        uid: currentUser.uid,
        nome: userProfile?.nome || '',
        acao: 'cpa_aprovado',
        detalhe: `${cpa?.player || 'sem depositante'} — ${cpa?.casa || ''}`,
      });
      showToast('✅ CPA aprovado!', 'green');
    } catch { showToast('Erro ao aprovar.', 'red'); }
    setSalvando(false);
  }

  async function rejeitar(id) {
    if (!motivo.trim()) { showToast('⚠️ Informe o motivo da rejeição!', 'yellow'); return; }
    setSalvando(true);
    try {
      const cpa = cpas.find(c => c.id === id);
      await updateDoc(doc(db, 'cpas', id), { status: 'rejeitado', motivoRejeicao: motivo.trim() });
      await registrarLog(tenantId, {
        uid: currentUser.uid,
        nome: userProfile?.nome || '',
        acao: 'cpa_rejeitado',
        detalhe: `${cpa?.player || 'sem depositante'} — ${cpa?.casa || ''} | Motivo: ${motivo.trim()}`,
      });
      showToast('❌ CPA rejeitado.', 'red');
      setRejeitandoId(null);
      setMotivo('');
    } catch { showToast('Erro ao rejeitar.', 'red'); }
    setSalvando(false);
  }

  async function reaprovar(id) {
    setSalvando(true);
    try {
      await updateDoc(doc(db, 'cpas', id), { status: 'aprovado', motivoRejeicao: null });
      showToast('✅ CPA reaprovado!', 'green');
    } catch { showToast('Erro.', 'red'); }
    setSalvando(false);
  }

  async function voltarPendente(id) {
    setSalvando(true);
    try {
      await updateDoc(doc(db, 'cpas', id), { status: 'pendente', motivoRejeicao: null });
      showToast('↩️ CPA voltou para pendente.', 'yellow');
    } catch { showToast('Erro.', 'red'); }
    setSalvando(false);
  }

  return (
    <div className="fade-in">
      {viewingItem && <ComprovanteViewer item={viewingItem} onClose={() => setViewingItem(null)} />}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'pendente', label: '⏳ Pendentes', count: pendentesCount, color: '#f59e0b' },
          { key: 'aprovado', label: '✅ Aprovados', count: aprovadosCount, color: 'var(--green)' },
          { key: 'rejeitado', label: '❌ Rejeitados', count: rejeitadosCount, color: 'var(--red)' },
        ].map(opt => (
          <button key={opt.key} onClick={() => setFiltro(opt.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 16px', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontWeight: 600,
              border: filtro === opt.key ? `2px solid ${opt.color}` : '1.5px solid var(--glass-border)',
              background: filtro === opt.key ? `${opt.color}22` : 'var(--glass-bg)',
              color: filtro === opt.key ? opt.color : 'var(--text)',
              transition: 'all .15s', backdropFilter: 'blur(12px)',
              boxShadow: filtro === opt.key ? `0 0 12px ${opt.color}44` : 'none',
            }}>
            {opt.label}
            <span style={{
              background: filtro === opt.key ? opt.color : 'var(--border)',
              color: filtro === opt.key ? '#000' : 'var(--text-muted)',
              fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
              minWidth: 22, textAlign: 'center',
              ...(opt.key === 'pendente' && pendentesCount > 0 ? { background: 'var(--red)', color: '#fff', animation: 'pulse-badge 1.8s ease-in-out infinite' } : {}),
            }}>{opt.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /><span className="loading-text">Carregando...</span></div>
      ) : cpas.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">{filtro === 'pendente' ? '🎉' : filtro === 'aprovado' ? '📋' : '📭'}</div>
          {filtro === 'pendente' ? 'Nenhum CPA aguardando aprovação!' : filtro === 'aprovado' ? 'Nenhum CPA aprovado ainda.' : 'Nenhum CPA rejeitado.'}
        </div>
      ) : (
        <div className="cpa-list">
          {cpas.map(cpa => {
            const user = users.find(u => u.uid === cpa.uid);
            const casa = casas.find(c => c.nome === cpa.casa);
            const valorExibido = cpa.valorCPA != null ? Number(cpa.valorCPA) : (casa?.valorAdmin ?? casa?.valor ?? 0);
            const imgs = getComprovantesNormalizados(cpa);
            const isRejeitando = rejeitandoId === cpa.id;

            return (
              <div key={cpa.id}>
                <div className="cpa-item" style={{
                  borderColor: filtro === 'pendente' ? 'rgba(245,158,11,0.3)' :
                    filtro === 'aprovado' ? 'rgba(26,170,110,0.2)' : 'rgba(229,57,53,0.2)',
                }}>
                  {imgs.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {imgs.map((img, idx) => (
                        <ComprovanteThumbnail key={idx} item={img} idx={idx} onClick={setViewingItem} size={44} />
                      ))}
                    </div>
                  )}
                  <div className="cpa-info" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                      {user?.foto ? (
                        <img src={user.foto} alt="av" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--accent)' }} />
                      ) : (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--card)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                          {(user?.nome || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{user?.nome || 'Desconhecido'}</span>
                    </div>
                    <div className="cpa-nome">{cpa.player || 'Sem depositante'}</div>
                    {cpa.motivoRejeicao && (
                      <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>Motivo: {cpa.motivoRejeicao}</div>
                    )}
                    <div className="cpa-meta">
                      <span>{formatTime(cpa.createdAt)}</span>
                      <span className="casa-tag">{cpa.casa}</span>
                      {cpa.valorDeposito > 0 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Dep: R$ {Number(cpa.valorDeposito).toLocaleString('pt-BR')}</span>
                      )}
                      {imgs.length > 0 && <span style={{ color: 'var(--green)', fontSize: 11 }}>📎 {imgs.length}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span className="cpa-valor">{fmtVal(valorExibido)}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {filtro === 'pendente' && (
                        <>
                          <button onClick={() => aprovar(cpa.id)} disabled={salvando}
                            style={{ background: 'rgba(26,170,110,0.15)', border: '1.5px solid var(--green)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'var(--green)', cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--font-body)' }}>
                            ✅ Aprovar
                          </button>
                          <button onClick={() => { setRejeitandoId(isRejeitando ? null : cpa.id); setMotivo(''); }} disabled={salvando}
                            style={{ background: 'rgba(229,57,53,0.15)', border: '1.5px solid var(--red)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'var(--red)', cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--font-body)' }}>
                            ❌ Rejeitar
                          </button>
                        </>
                      )}
                      {filtro === 'aprovado' && (
                        <button onClick={() => voltarPendente(cpa.id)} disabled={salvando}
                          style={{ background: 'rgba(245,158,11,0.15)', border: '1.5px solid #f59e0b', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#f59e0b', cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--font-body)' }}>
                          ↩️ Pendente
                        </button>
                      )}
                      {filtro === 'rejeitado' && (
                        <button onClick={() => reaprovar(cpa.id)} disabled={salvando}
                          style={{ background: 'rgba(26,170,110,0.15)', border: '1.5px solid var(--green)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'var(--green)', cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--font-body)' }}>
                          ✅ Reaprovar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {isRejeitando && (
                  <div style={{ background: 'rgba(229,57,53,0.08)', border: '1px solid rgba(229,57,53,0.3)', borderRadius: 10, padding: '12px 14px', marginTop: 4 }}>
                    <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Motivo da rejeição</div>
                    <input className="input-field" value={motivo} onChange={e => setMotivo(e.target.value)}
                      placeholder="Ex: Depósito não identificado, valor incorreto..."
                      style={{ marginBottom: 8, borderColor: 'rgba(229,57,53,0.4)' }} autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') rejeitar(cpa.id); if (e.key === 'Escape') { setRejeitandoId(null); setMotivo(''); } }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => rejeitar(cpa.id)} disabled={salvando || !motivo.trim()}
                        style={{ background: 'var(--red)', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#fff', cursor: motivo.trim() ? 'pointer' : 'not-allowed', fontWeight: 700, opacity: motivo.trim() ? 1 : 0.5, fontFamily: 'var(--font-body)' }}>
                        {salvando ? 'Salvando...' : '❌ Confirmar rejeição'}
                      </button>
                      <button onClick={() => { setRejeitandoId(null); setMotivo(''); }}
                        style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}