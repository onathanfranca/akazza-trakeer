// src/pages/AdminPainel.js
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useAllCPAs } from '../hooks/useAllCPAs';

function today() { return format(new Date(), 'yyyy-MM-dd'); }

export default function AdminPainel({ casas, users, metaDiaria }) {
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [applied, setApplied] = useState({ from: today(), to: today() });
  const [filterCasa, setFilterCasa] = useState('Todas');

  const { cpas, loading } = useAllCPAs(applied.from, applied.to);

  // Build per-user stats
  const afiliadoStats = useMemo(() => {
    const map = {};
    cpas.forEach(cpa => {
      if (filterCasa !== 'Todas' && cpa.casa !== filterCasa) return;
      const user = users.find(u => u.uid === cpa.uid);
      if (!user) return;
      if (!map[cpa.uid]) map[cpa.uid] = { nome: user.nome, count: 0, faturamento: 0, custo: 0 };
      const casa = casas.find(c => c.nome === cpa.casa);
      map[cpa.uid].count++;
      if (casa) { map[cpa.uid].faturamento += casa.valor; map[cpa.uid].custo += casa.custo; }
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [cpas, users, casas, filterCasa]);

  const totals = useMemo(() => {
    let total = 0, fat = 0, custo = 0;
    afiliadoStats.forEach(a => { total += a.count; fat += a.faturamento; custo += a.custo; });
    return { total, fat, custo, lucro: fat - custo };
  }, [afiliadoStats]);

  const pct = Math.min((totals.total / (metaDiaria || 50)) * 100, 100);
  function fmt(n) { return `R$ ${n.toLocaleString('pt-BR')}`; }

  return (
    <div className="fade-in">
      <div className="date-filter">
        <label>De</label>
        <input type="date" className="date-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <label>Até</label>
        <input type="date" className="date-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <button className="btn-filter" onClick={() => setApplied({ from: dateFrom, to: dateTo })}>Filtrar</button>
      </div>

      <div className="resumo-grid">
        <div className="resumo-card"><div className="resumo-label">Total CPAs</div><div className="resumo-val white">{totals.total}</div></div>
        <div className="resumo-card"><div className="resumo-label">Faturamento</div><div className="resumo-val yellow">{fmt(totals.fat)}</div></div>
        <div className="resumo-card"><div className="resumo-label">Custo</div><div className="resumo-val red">{fmt(totals.custo)}</div></div>
        <div className="resumo-card"><div className="resumo-label">Lucro</div><div className="resumo-val green">{fmt(totals.lucro)}</div></div>
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
          <div key={nome} className={`chip${filterCasa === nome ? ' active' : ''}`} onClick={() => setFilterCasa(nome)}>
            {nome}
          </div>
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
              <div className="aff-name">{aff.nome}</div>
              <div className="aff-cpas">{aff.count}<span> CPAs</span></div>
              <div className="aff-fin">
                <div className="fin-row"><span className="fin-label">Faturamento</span><span className="fin-val yellow">{fmt(aff.faturamento)}</span></div>
                <div className="fin-row"><span className="fin-label">Lucro</span><span className="fin-val green">{fmt(aff.faturamento - aff.custo)}</span></div>
                <div className="fin-row"><span className="fin-label">Custo</span><span className="fin-val red">{fmt(aff.custo)}</span></div>
                <div className="fin-row"><span className="fin-label">R$/CPA</span><span className="fin-val">{aff.count > 0 ? fmt(Math.round(aff.faturamento / aff.count)) : '--'}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
