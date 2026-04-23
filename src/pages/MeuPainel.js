// src/pages/MeuPainel.js
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useCPAs } from '../hooks/useCPAs';
import { useToast } from '../context/ToastContext';

function today() { return format(new Date(), 'yyyy-MM-dd'); }

export default function MeuPainel({ casas, metaDiaria }) {
  const { currentUser } = useAuth();
  const { showCPAToast, showToast } = useToast();

  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [applied, setApplied] = useState({ from: today(), to: today() });

  const { cpas, loading, addCPA, removeCPA, editCPA } = useCPAs(currentUser?.uid, applied.from, applied.to);

  const [selectedCasa, setSelectedCasa] = useState('');
  const [player, setPlayer] = useState('');
  const [adding, setAdding] = useState(false);
  const [filterCasa, setFilterCasa] = useState('Todas');
  const [editingId, setEditingId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editCasaVal, setEditCasaVal] = useState('');

  const filteredCPAs = useMemo(() =>
    filterCasa === 'Todas' ? cpas : cpas.filter(c => c.casa === filterCasa),
    [cpas, filterCasa]
  );

  // Compute financials
  const stats = useMemo(() => {
    let faturamento = 0, custo = 0;
    cpas.forEach(c => {
      const casa = casas.find(x => x.nome === c.casa);
      if (casa) { faturamento += casa.valor; custo += casa.custo; }
    });
    return { total: cpas.length, faturamento, custo, lucro: faturamento - custo };
  }, [cpas, casas]);

  const pct = Math.min((stats.total / (metaDiaria || 50)) * 100, 100);

  async function handleAdd() {
    if (!selectedCasa) { showToast('⚠️ Selecione uma casa!', 'yellow'); return; }
    setAdding(true);
    try {
      await addCPA(selectedCasa, player);
      setPlayer('');
      showCPAToast();
    } catch { showToast('Erro ao registrar CPA.', 'red'); }
    setAdding(false);
  }

  async function handleRemove(id) {
    try { await removeCPA(id); showToast('CPA removido.', 'yellow'); }
    catch { showToast('Erro ao remover.', 'red'); }
  }

  function startEdit(cpa) {
    setEditingId(cpa.id);
    setEditNome(cpa.player || '');
    setEditCasaVal(cpa.casa);
  }

  async function handleSaveEdit(id) {
    try {
      await editCPA(id, { player: editNome, casa: editCasaVal });
      showToast('✅ CPA atualizado!', 'green');
      setEditingId(null);
    } catch { showToast('Erro ao atualizar.', 'red'); }
  }

  function formatTime(ts) {
    if (!ts) return '--:--';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return format(d, 'HH:mm');
  }

  function fmt(n) { return `R$ ${n.toLocaleString('pt-BR')}`; }

  return (
    <div className="fade-in">
      {/* Date Filter */}
      <div className="date-filter">
        <label>De</label>
        <input type="date" className="date-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <label>Até</label>
        <input type="date" className="date-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <button className="btn-filter" onClick={() => setApplied({ from: dateFrom, to: dateTo })}>Filtrar</button>
      </div>

      {/* Stats */}
      <div className="resumo-grid">
        <div className="resumo-card"><div className="resumo-label">CPAs</div><div className="resumo-val white">{stats.total}</div></div>
        <div className="resumo-card"><div className="resumo-label">Faturamento</div><div className="resumo-val yellow">{fmt(stats.faturamento)}</div></div>
        <div className="resumo-card"><div className="resumo-label">Custo</div><div className="resumo-val red">{fmt(stats.custo)}</div></div>
        <div className="resumo-card"><div className="resumo-label">Lucro</div><div className="resumo-val green">{fmt(stats.lucro)}</div></div>
      </div>

      {/* Meta */}
      <div className="meta-bar">
        <div className="meta-header">
          <div>
            <div className="meta-title">MEUS CPAs</div>
            <div className="meta-sub">{stats.total} de {metaDiaria} • Faltam {Math.max(0, metaDiaria - stats.total)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="meta-count">{stats.total} <span>/ {metaDiaria}</span></div>
          </div>
        </div>
        <div className="progress-track">
          <div className={`progress-fill${pct >= 100 ? ' done' : ''}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Add CPA */}
      <div className="add-box">
        <div className="add-title">➕ Registrar CPA</div>
        <div className="add-grid">
          <select className="input-field" value={selectedCasa} onChange={e => setSelectedCasa(e.target.value)}>
            <option value="">Selecione a casa...</option>
            {casas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
          <input className="input-field" type="text" placeholder="Nome do player (opcional)" value={player} onChange={e => setPlayer(e.target.value)} />
        </div>
        <button className="btn-primary btn-full" onClick={handleAdd} disabled={adding}>
          {adding ? 'Registrando...' : '+ Registrar CPA'}
        </button>
      </div>

      {/* Filter chips */}
      <div className="chips">
        {['Todas', ...casas.map(c => c.nome)].map(nome => (
          <div key={nome} className={`chip${filterCasa === nome ? ' active' : ''}`} onClick={() => setFilterCasa(nome)}>
            {nome}
          </div>
        ))}
      </div>

      <div className="section-title">📋 Histórico</div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /><span className="loading-text">Carregando CPAs...</span></div>
      ) : filteredCPAs.length === 0 ? (
        <div className="empty"><div className="empty-icon">📭</div>Nenhum CPA neste período.</div>
      ) : (
        <div className="cpa-list">
          {filteredCPAs.map(cpa => {
            const casa = casas.find(c => c.nome === cpa.casa);
            return (
              <div key={cpa.id}>
                <div className="cpa-item">
                  <div className="cpa-info">
                    <div className="cpa-nome">{cpa.player || 'CPA sem nome'}</div>
                    <div className="cpa-meta">
                      <span>{formatTime(cpa.createdAt)}</span>
                      <span className="casa-tag">{cpa.casa}</span>
                    </div>
                  </div>
                  <div className="cpa-actions">
                    <span className="cpa-valor">{casa ? fmt(casa.valor) : '--'}</span>
                    <button className="btn-icon" onClick={() => editingId === cpa.id ? setEditingId(null) : startEdit(cpa)}>✏️</button>
                    <button className="btn-danger" onClick={() => handleRemove(cpa.id)}>✕</button>
                  </div>
                </div>
                {editingId === cpa.id && (
                  <div className="cpa-edit-row">
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div className="input-small-label">Nome do player</div>
                      <input className="input-edit" value={editNome} onChange={e => setEditNome(e.target.value)} placeholder="Nome do player" />
                    </div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div className="input-small-label">Casa</div>
                      <select className="input-edit" style={{ cursor: 'pointer' }} value={editCasaVal} onChange={e => setEditCasaVal(e.target.value)}>
                        {casas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                      <button className="btn-save" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => handleSaveEdit(cpa.id)}>Salvar</button>
                      <button className="btn-secondary" style={{ padding: '7px 10px', fontSize: 12 }} onClick={() => setEditingId(null)}>Cancelar</button>
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
