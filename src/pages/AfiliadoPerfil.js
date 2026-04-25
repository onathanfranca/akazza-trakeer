// src/pages/AfiliadoPerfil.js
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format, startOfDay, endOfDay, parseISO, subDays } from 'date-fns';

function today() { return format(new Date(), 'yyyy-MM-dd'); }
function daysAgo(n) { return format(subDays(new Date(), n), 'yyyy-MM-dd'); }
function fmtVal(n) { return `R$ ${Number(n || 0).toLocaleString('pt-BR')}`; }
function formatTime(ts) {
  if (!ts) return '--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'dd/MM HH:mm');
}

function getValorCPA(cpa, casa, userRole) {
  if (cpa.valorCPA != null) return Number(cpa.valorCPA);
  if (!casa) return 0;
  if (userRole === 'admin') return casa.valorAdmin ?? casa.valor ?? 0;
  return casa.valorAfiliado ?? casa.valor ?? 0;
}

export default function AfiliadoPerfil({ user, casas, onClose }) {
  const [cpas, setCpas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(daysAgo(30));
  const [dateTo, setDateTo] = useState(today());
  const [filterCasa, setFilterCasa] = useState('Todas');
  const [viewingImg, setViewingImg] = useState(null);

  const userRole = user.role || 'afiliado';

  async function fetchCpas() {
    setLoading(true);
    const from = Timestamp.fromDate(startOfDay(parseISO(dateFrom)));
    const to = Timestamp.fromDate(endOfDay(parseISO(dateTo)));
    const q = query(
      collection(db, 'cpas'),
      where('uid', '==', user.uid),
      where('createdAt', '>=', from),
      where('createdAt', '<=', to),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    setCpas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  useEffect(() => { fetchCpas(); }, []);

  const filtered = useMemo(() =>
    filterCasa === 'Todas' ? cpas : cpas.filter(c => c.casa === filterCasa),
    [cpas, filterCasa]
  );

  const stats = useMemo(() => {
    let faturamento = 0, totalDeposito = 0;
    cpas.forEach(c => {
      const casa = casas.find(x => x.nome === c.casa);
      faturamento += getValorCPA(c, casa, userRole);
      if (c.valorDeposito) totalDeposito += Number(c.valorDeposito);
    });
    return { total: cpas.length, faturamento, totalDeposito };
  }, [cpas, casas, userRole]);

  function getComprovantes(cpa) {
    if (cpa.comprovantes?.length > 0) return cpa.comprovantes;
    if (cpa.comprovante) return [cpa.comprovante];
    return [];
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
      {viewingImg && (
        <div onClick={() => setViewingImg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <img src={viewingImg} alt="comprovante" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12 }} />
          <button onClick={() => setViewingImg(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--accent)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#000', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ background: 'var(--bg)', borderRadius: 16, width: '100%', maxWidth: 680, padding: 24, marginTop: 16, border: '1px solid var(--border)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {user.foto ? (
              <img src={user.foto} alt="avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--card)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--text-muted)' }}>
                {(user.nome || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{user.nome}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</div>
              <span style={{ fontSize: 11, background: userRole === 'admin' ? 'var(--accent)' : 'var(--surface)', color: userRole === 'admin' ? '#000' : 'var(--muted)', border: userRole !== 'admin' ? '1px solid var(--border)' : 'none', borderRadius: 4, padding: '2px 7px' }}>
                {userRole === 'admin' ? 'ADMIN' : 'Afiliado'}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}>✕ Fechar</button>
        </div>

        <div className="date-filter" style={{ marginBottom: 16 }}>
          <label>De</label>
          <input type="date" className="date-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <label>Até</label>
          <input type="date" className="date-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <button className="btn-filter" onClick={fetchCpas}>Filtrar</button>
        </div>

        <div className="resumo-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
          <div className="resumo-card"><div className="resumo-label">CPAs</div><div className="resumo-val white">{stats.total}</div></div>
          <div className="resumo-card"><div className="resumo-label">Faturamento</div><div className="resumo-val" style={{ color: 'var(--accent)' }}>{fmtVal(stats.faturamento)}</div></div>
          <div className="resumo-card"><div className="resumo-label">Total Dep.</div><div className="resumo-val green">{fmtVal(stats.totalDeposito)}</div></div>
        </div>

        <div className="chips" style={{ marginBottom: 12 }}>
          {['Todas', ...casas.map(c => c.nome)].map(nome => (
            <div key={nome} className={`chip${filterCasa === nome ? ' active' : ''}`} onClick={() => setFilterCasa(nome)}>{nome}</div>
          ))}
        </div>

        <div className="section-title">📋 CPAs — {filtered.length} registro{filtered.length !== 1 ? 's' : ''}</div>

        {loading ? (
          <div className="loading-wrap"><div className="spinner" /><span className="loading-text">Carregando...</span></div>
        ) : filtered.length === 0 ? (
          <div className="empty"><div className="empty-icon">📭</div>Nenhum CPA neste período.</div>
        ) : (
          <div className="cpa-list">
            {filtered.map(cpa => {
              const casa = casas.find(c => c.nome === cpa.casa);
              const valorExibido = getValorCPA(cpa, casa, userRole);
              const imgs = getComprovantes(cpa);
              return (
                <div key={cpa.id} className="cpa-item">
                  {imgs.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {imgs.map((img, idx) => (
                        <img key={idx} src={img} alt="comprovante" onClick={() => setViewingImg(img)}
                          style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1.5px solid var(--accent)' }} />
                      ))}
                    </div>
                  )}
                  <div className="cpa-info">
                    <div className="cpa-nome">{cpa.player || 'Sem depositante'}</div>
                    <div className="cpa-meta">
                      <span>{formatTime(cpa.createdAt)}</span>
                      <span className="casa-tag">{cpa.casa}</span>
                      {cpa.valorDeposito > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Dep: R$ {Number(cpa.valorDeposito).toLocaleString('pt-BR')}</span>}
                      {imgs.length > 0 && <span style={{ color: 'var(--green)', fontSize: 11 }}>📎 {imgs.length}</span>}
                    </div>
                  </div>
                  <div className="cpa-actions">
                    <span className="cpa-valor" style={{ color: valorExibido < 0 ? 'var(--red)' : 'var(--accent)' }}>
                      {fmtVal(valorExibido)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
