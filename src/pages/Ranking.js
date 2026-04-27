// src/pages/Ranking.js
import React, { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { useAllCPAs } from '../hooks/useAllCPAs';

function today() { return format(new Date(), 'yyyy-MM-dd'); }
function daysAgo(n) { return format(subDays(new Date(), n), 'yyyy-MM-dd'); }

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

// Pega valorCPA congelado no CPA ou busca na casa pelo role
function getValorCPA(cpa, casa, userRole) {
  if (cpa.valorCPA != null) return Number(cpa.valorCPA);
  if (!casa) return 0;
  if (userRole === 'admin') return casa.valorAdmin ?? casa.valor ?? 0;
  return casa.valorAfiliado ?? casa.valor ?? 0;
}

export default function Ranking({ casas, users }) {
  const [periodo, setPeriodo] = useState('7d');
  const [dateFrom, setDateFrom] = useState(daysAgo(6));
  const [dateTo, setDateTo] = useState(today());
  const [applied, setApplied] = useState({ from: daysAgo(6), to: today() });
  const [filterCasa, setFilterCasa] = useState('Todas');

  const { cpas, loading } = useAllCPAs(applied.from, applied.to);

  const ranked = useMemo(() => {
    const map = {};
    cpas.forEach(cpa => {
      if (filterCasa !== 'Todas' && cpa.casa !== filterCasa) return;
      const user = users.find(u => u.uid === cpa.uid);
      if (!user) return;
      if (!map[cpa.uid]) map[cpa.uid] = { nome: user.nome, foto: user.foto || null, role: user.role, count: 0, faturamento: 0, custo: 0, lucro: 0 };
      const casa = casas.find(c => c.nome === cpa.casa);
      map[cpa.uid].count++;
      const valorCPA = getValorCPA(cpa, casa, user.role);
      const custo = Number(cpa.valorDeposito || 0);
      map[cpa.uid].faturamento += valorCPA;
      map[cpa.uid].custo += custo;
      map[cpa.uid].lucro += valorCPA - custo;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [cpas, users, casas, filterCasa]);

  function fmt(n) { return `R$ ${n.toLocaleString('pt-BR')}`; }

  return (
    <div className="fade-in">
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
              color: periodo === opt.value ? '#000' : 'var(--text)',
              transition: 'all .15s'
            }}
          >{opt.label}</button>
        ))}
      </div>
      {/* Filtro personalizado */}
      {periodo === 'custom' && (
        <div className="date-filter" style={{ marginBottom: 10 }}>
          <label>De</label>
          <input type="date" className="date-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <label>Até</label>
          <input type="date" className="date-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <button className="btn-filter" onClick={() => setApplied({ from: dateFrom, to: dateTo })}>Filtrar</button>
        </div>
      )}

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
                <div className="rank-sub">Fat: {fmt(aff.faturamento)} • Dep: {fmt(aff.custo)} • Lucro: <span style={{color: aff.lucro < 0 ? 'var(--red)' : 'var(--green)'}}>{fmt(aff.lucro)}</span></div>
              </div>
              <div className="rank-num">{aff.count}<span> CPAs</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
