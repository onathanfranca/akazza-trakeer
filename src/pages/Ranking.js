// src/pages/Ranking.js
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useAllCPAs } from '../hooks/useAllCPAs';

function today() { return format(new Date(), 'yyyy-MM-dd'); }

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_CLASSES = ['gold', 'silver', 'bronze'];

function Avatar({ foto, nome, size = 36 }) {
  if (foto) return (
    <img src={foto} alt="avatar" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)', flexShrink: 0 }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: 'var(--card)',
      border: '2px solid var(--accent)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.4, color: 'var(--text-muted)', flexShrink: 0
    }}>
      {(nome || '?')[0].toUpperCase()}
    </div>
  );
}

export default function Ranking({ casas, users }) {
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [applied, setApplied] = useState({ from: today(), to: today() });
  const [filterCasa, setFilterCasa] = useState('Todas');

  const { cpas, loading } = useAllCPAs(applied.from, applied.to);

  const ranked = useMemo(() => {
    const map = {};
    cpas.forEach(cpa => {
      if (filterCasa !== 'Todas' && cpa.casa !== filterCasa) return;
      const user = users.find(u => u.uid === cpa.uid);
      if (!user) return;
      if (!map[cpa.uid]) map[cpa.uid] = { nome: user.nome, foto: user.foto || null, count: 0, faturamento: 0, lucro: 0 };
      const casa = casas.find(c => c.nome === cpa.casa);
      map[cpa.uid].count++;
      if (casa) { map[cpa.uid].faturamento += casa.valor; map[cpa.uid].lucro += (casa.valor - casa.custo); }
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [cpas, users, casas, filterCasa]);

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

      <div className="section-title">🏆 Ranking de CPAs</div>

      <div className="chips">
        {['Todas', ...casas.map(c => c.nome)].map(nome => (
          <div key={nome} className={`chip${filterCasa === nome ? ' active' : ''}`} onClick={() => setFilterCasa(nome)}>
            {nome}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /><span className="loading-text">Calculando ranking...</span></div>
      ) : ranked.length === 0 ? (
        <div className="empty"><div className="empty-icon">🏆</div>Nenhum dado neste período.</div>
      ) : (
        <div className="rank-list">
          {ranked.map((aff, i) => (
            <div className="rank-item" key={aff.nome}>
              <div className={`rank-pos${i < 3 ? ` ${MEDAL_CLASSES[i]}` : ''}`}>
                {i < 3 ? MEDALS[i] : i + 1}
              </div>
              <Avatar foto={aff.foto} nome={aff.nome} size={36} />
              <div className="rank-info">
                <div className="rank-nome">{aff.nome}</div>
                <div className="rank-sub">Fat: {fmt(aff.faturamento)} • Lucro: {fmt(aff.lucro)}</div>
              </div>
              <div className="rank-num">{aff.count}<span> CPAs</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
