// src/pages/AdminPainel.js
import React, { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAllCPAs } from '../hooks/useAllCPAs';
import { useEffect } from 'react';

function today() { return format(new Date(), 'yyyy-MM-dd'); }
function daysAgo(n) { return format(subDays(new Date(), n), 'yyyy-MM-dd'); }
function fmtVal(n) { return `R$ ${Number(Math.abs(n || 0)).toLocaleString('pt-BR')}`; }
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

function usePendentes() {
  const [pendentes, setPendentes] = useState([]);
  useEffect(() => {
    const q = query(collection(db, 'cpas'), where('status', '==', 'pendente'));
    const unsub = onSnapshot(q, snap => {
      setPendentes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);
  return pendentes;
}

export default function AdminPainel({ casas, users, metaDiaria, onNewCPA, config }) {
  const [periodo, setPeriodo] = useState('7d');
  const [dateFrom, setDateFrom] = useState(daysAgo(6));
  const [dateTo, setDateTo] = useState(today());
  const [applied, setApplied] = useState({ from: daysAgo(6), to: today() });
  const [filterCasa, setFilterCasa] = useState('Todas');
  const [rejeitandoId, setRejeitandoId] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [processando, setProcessando] = useState('');

  const aprovacaoAuto = config?.aprovacaoAutomatica !== false;
  const pendentes = usePendentes();
  const { cpas, loading } = useAllCPAs(applied.from, applied.to, onNewCPA);

  // Só conta CPAs aprovados (ou sem status = legado)
  const afiliadoStats = useMemo(() => {
    const map = {};
    cpas.forEach(cpa => {
      if (cpa.status === 'pendente' || cpa.status === 'rejeitado') return;
      if (filterCasa !== 'Todas' && cpa.casa !== filterCasa) return;
      const user = users.find(u => u.uid === cpa.uid);
      if (!user) return;
      if (!map[cpa.uid]) map[cpa.uid] = { nome: user.nome, foto: user.foto || null, role: user.role, count: 0, faturamento: 0, custo: 0 };
      const casa = casas.find(c => c.nome === cpa.casa);
      map[cpa.uid].count++;
      map[cpa.uid].faturamento += getValorCPA(cpa, casa, user.role);
      map[cpa.uid].custo += Number(cpa.valorDeposito || 0);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [cpas, users, casas, filterCasa]);

  const totals = useMemo(() => {
    let total = 0, fat = 0, custo = 0;
    afiliadoStats.forEach(a => { total += a.count; fat += a.faturamento; custo += a.custo; });
    return { total, fat, custo, lucro: fat - custo };
  }, [afiliadoStats]);

  const pct = Math.min((totals.total / (metaDiaria || 50)) * 100, 100);

  async function handleAprovar(id) {
    setProcessando(id);
    try { await updateDoc(doc(db, 'cpas', id), { status: 'aprovado', motivoRejeicao: null }); }
    catch (e) { console.error(e); }
    setProcessando('');
  }

  async function handleRejeitar(id) {
    if (!motivo.trim()) return;
    setProcessando(id);
    try {
      await updateDoc(doc(db, 'cpas', id), { status: 'rejeitado', motivoRejeicao: motivo });
      setRejeitandoId(null);
      setMotivo('');
    } catch (e) { console.error(e); }
    setProcessando('');
  }

  return (
    <div className="fade-in">

      {/* Fila de pendentes — só aparece se aprovação manual e tiver pendentes */}
      {!aprovacaoAuto && pendentes.length > 0 && (
        <div className="manage-box" style={{ marginBottom: 18, borderColor: 'var(--accent)' }}>
          <div className="manage-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            🔍 CPAs Pendentes
            <span style={{ background: 'var(--accent)', color: '#000', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
              {pendentes.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendentes.map(cpa => {
              const user = users.find(u => u.uid === cpa.uid);
              const casa = casas.find(c => c.nome === cpa.casa);
              const valor = getValorCPA(cpa, casa, user?.role || 'afiliado');
              return (
                <div key={cpa.id} style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.nome || 'Afiliado'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {cpa.player || 'Sem depositante'} • {cpa.casa} • {formatTime(cpa.createdAt)}
                        {cpa.valorDeposito > 0 && ` • Dep: R$ ${Number(cpa.valorDeposito).toLocaleString('pt-BR')}`}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--accent)' }}>
                      {fmtVal(valor)}
                    </div>
                  </div>

                  {/* Comprovantes */}
                  {cpa.comprovantes?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {cpa.comprovantes.map((img, idx) => (
                        <img key={idx} src={img} alt="comp"
                          onClick={() => window.open(img, '_blank')}
                          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1.5px solid var(--accent)' }} />
                      ))}
                    </div>
                  )}

                  {/* Botões */}
                  {rejeitandoId === cpa.id ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input className="input-field" style={{ flex: 1, minWidth: 160 }}
                        placeholder="Motivo da rejeição..."
                        value={motivo} onChange={e => setMotivo(e.target.value)} />
                      <button className="btn-danger" style={{ padding: '7px 14px', fontSize: 12 }}
                        onClick={() => handleRejeitar(cpa.id)} disabled={processando === cpa.id}>
                        {processando === cpa.id ? '...' : 'Confirmar'}
                      </button>
                      <button className="btn-secondary" style={{ padding: '7px 10px', fontSize: 12 }}
                        onClick={() => { setRejeitandoId(null); setMotivo(''); }}>Cancelar</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button className="btn-save" style={{ padding: '7px 18px', fontSize: 12 }}
                        onClick={() => handleAprovar(cpa.id)} disabled={processando === cpa.id}>
                        {processando === cpa.id ? '...' : '✅ Aprovar'}
                      </button>
                      <button className="btn-danger" style={{ padding: '7px 14px', fontSize: 12 }}
                        onClick={() => setRejeitandoId(cpa.id)}>
                        ❌ Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Período rápido */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Hoje', value: '1d' },
          { label: '7 dias', value: '7d' },
          { label: '30 dias', value: '30d' },
          { label: 'Personalizado', value: 'custom' },
        ].map(opt => (
          <button key={opt.value}
            onClick={() => {
              setPeriodo(opt.value);
              if (opt.value === '1d') { const d = today(); setDateFrom(d); setDateTo(d); setApplied({ from: d, to: d }); }
              else if (opt.value === '7d') { const f = daysAgo(6); setDateFrom(f); setDateTo(today()); setApplied({ from: f, to: today() }); }
              else if (opt.value === '30d') { const f = daysAgo(29); setDateFrom(f); setDateTo(today()); setApplied({ from: f, to: today() }); }
            }}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600,
              border: periodo === opt.value ? '2px solid var(--accent)' : '1.5px solid var(--border)',
              background: periodo === opt.value ? 'var(--accent)' : 'var(--card)',
              color: periodo === opt.value ? '#000' : 'var(--text)', transition: 'all .15s'
            }}
          >{opt.label}</button>
        ))}
      </div>
      {periodo === 'custom' && (
        <div className="date-filter" style={{ marginBottom: 10 }}>
          <label>De</label>
          <input type="date" className="date-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <label>Até</label>
          <input type="date" className="date-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <button className="btn-filter" onClick={() => setApplied({ from: dateFrom, to: dateTo })}>Filtrar</button>
        </div>
      )}

      <div className="resumo-grid">
        <div className="resumo-card"><div className="resumo-label">Total CPAs</div><div className="resumo-val white">{totals.total}</div></div>
        <div className="resumo-card"><div className="resumo-label">Faturamento</div><div className="resumo-val yellow">{fmtVal(totals.fat)}</div></div>
        <div className="resumo-card"><div className="resumo-label">Custo (Dep.)</div><div className="resumo-val red">{fmtVal(totals.custo)}</div></div>
        <div className="resumo-card"><div className="resumo-label">Lucro</div><div className="resumo-val" style={{ color: totals.lucro < 0 ? 'var(--red)' : 'var(--green)' }}>{fmtVal(totals.lucro)}</div></div>
      </div>

      <div className="meta-bar">
        <div className="meta-header">
          <div>
            <div className="meta-title">META DO DIA</div>
            <div className="meta-sub">{totals.total} de {metaDiaria} CPAs • Faltam {Math.max(0, metaDiaria - totals.total)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="meta-count">{totals.total} <span>/ {metaDiaria}</span></div>
          </div>
        </div>
        <div className="progress-track">
          <div className={`progress-fill${pct >= 100 ? ' done' : ''}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="section-title">👥 Afiliados</div>
      <div className="chips">
        {['Todas', ...casas.map(c => c.nome)].map(nome => (
          <div key={nome} className={`chip${filterCasa === nome ? ' active' : ''}`} onClick={() => setFilterCasa(nome)}>{nome}</div>
        ))}
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /><span className="loading-text">Carregando dados...</span></div>
      ) : afiliadoStats.length === 0 ? (
        <div className="empty"><div className="empty-icon">📊</div>Nenhum CPA aprovado neste período.</div>
      ) : (
        <div className="aff-grid">
          {afiliadoStats.map(aff => {
            const lucro = aff.faturamento - aff.custo;
            return (
              <div className="aff-card" key={aff.nome}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  {aff.foto ? (
                    <img src={aff.foto} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                      {(aff.nome || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="aff-name">{aff.nome}</div>
                    {aff.role === 'admin' && <span style={{ fontSize: 10, background: 'var(--accent)', color: '#000', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>ADMIN</span>}
                  </div>
                </div>
                <div className="aff-cpas">{aff.count}<span> CPAs</span></div>
                <div className="aff-fin">
                  <div className="fin-row"><span className="fin-label">Faturamento</span><span className="fin-val yellow">{fmtVal(aff.faturamento)}</span></div>
                  <div className="fin-row"><span className="fin-label">Lucro</span><span className="fin-val" style={{ color: lucro < 0 ? 'var(--red)' : 'var(--green)' }}>{fmtVal(lucro)}</span></div>
                  <div className="fin-row"><span className="fin-label">Custo (Dep.)</span><span className="fin-val red">{fmtVal(aff.custo)}</span></div>
                  <div className="fin-row"><span className="fin-label">R$/CPA</span><span className="fin-val">{aff.count > 0 ? fmtVal(Math.round(aff.faturamento / aff.count)) : '--'}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
