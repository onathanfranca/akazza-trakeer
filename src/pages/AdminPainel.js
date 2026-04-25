// src/pages/AdminPainel.js
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useAllCPAs } from '../hooks/useAllCPAs';

function today() { return format(new Date(), 'yyyy-MM-dd'); }

function fmtVal(n) {
  const num = Number(n || 0);
  return `R$ ${Math.abs(num).toLocaleString('pt-BR')}`;
}

function ValColor({ value, className }) {
  const num = Number(value || 0);
  return <span className={className} style={{ color: num < 0 ? 'var(--red)' : undefined }}>{fmtVal(num)}</span>;
}

// Pega o valor do CPA: usa valorCPA congelado se existir, senão busca na casa pelo role
function getValorCPA(cpa, casa, userRole) {
  if (cpa.valorCPA != null) return Number(cpa.valorCPA);
  if (!casa) return 0;
  if (userRole === 'admin') return casa.valorAdmin ?? casa.valor ?? 0;
  return casa.valorAfiliado ?? casa.valor ?? 0;
}

export default function AdminPainel({ casas, users, metaDiaria }) {
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [applied, setApplied] = useState({ from: today(), to: today() });
  const [filterCasa, setFilterCasa] = useState('Todas');

  const { cpas, loading } = useAllCPAs(applied.from, applied.to);

  const afiliadoStats = useMemo(() => {
    const map = {};
    cpas.forEach(cpa => {
      if (filterCasa !== 'Todas' && cpa.casa !== filterCasa) return;
      const user = users.find(u => u.uid === cpa.uid);
      if (!user) return;
      if (!map[cpa.uid]) map[cpa.uid] = { nome: user.nome, foto: user.foto || null, role: user.role, count: 0, faturamento: 0, totalDeposito: 0 };
      const casa = casas.find(c => c.nome === cpa.casa);
      map[cpa.uid].count++;
      map[cpa.uid].faturamento += getValorCPA(cpa, casa, user.role);
      if (cpa.valorDeposito) map[cpa.uid].totalDeposito += Number(cpa.valorDeposito);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [cpas, users, casas, filterCasa]);

  const totals = useMemo(() => {
    let total = 0, fat = 0, deposito = 0;
    afiliadoStats.forEach(a => { total += a.count; fat += a.faturamento; deposito += a.totalDeposito; });
    return { total, fat, deposito };
  }, [afiliadoStats]);

  const pct = Math.min((totals.total / (metaDiaria || 50)) * 100, 100);

  return (
    <div className="fade-in">
      <div className="date-filter">
        <label>De</label>
        <input type="date" className="date-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <label>Até</label>
        <input type="date" className="date-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <button className="btn-filter" onClick={() => setApplied({ from: dateFrom, to: dateTo })}>Filtrar</button>
      </div>

      <div className="resumo-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="resumo-card"><div className="resumo-label">Total CPAs</div><div className="resumo-val white">{totals.total}</div></div>
        <div className="resumo-card"><div className="resumo-label">Faturamento</div><div className="resumo-val" style={{ color: 'var(--accent)' }}>{fmtVal(totals.fat)}</div></div>
        <div className="resumo-card"><div className="resumo-label">Total Depósitos</div><div className="resumo-val green">{fmtVal(totals.deposito)}</div></div>
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
        <div className="empty"><div className="empty-icon">📊</div>Nenhum CPA neste período.</div>
      ) : (
        <div className="aff-grid">
          {afiliadoStats.map(aff => (
            <div className="aff-card" key={aff.nome}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {aff.foto ? (
                  <img src={aff.foto} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--text-muted)' }}>
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
                <div className="fin-row"><span className="fin-label">Faturamento</span><span className="fin-val" style={{ color: 'var(--accent)' }}>{fmtVal(aff.faturamento)}</span></div>
                <div className="fin-row"><span className="fin-label">Total Dep.</span><span className="fin-val green">{fmtVal(aff.totalDeposito)}</span></div>
                <div className="fin-row"><span className="fin-label">R$/CPA</span><span className="fin-val">{aff.count > 0 ? fmtVal(Math.round(aff.faturamento / aff.count)) : '--'}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
