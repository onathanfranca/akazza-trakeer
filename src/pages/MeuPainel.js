// src/pages/MeuPainel.js
import React, { useState, useMemo, useRef } from 'react';
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
  const [comprovante, setComprovante] = useState(null);
  const [comprovantePreview, setComprovantePreview] = useState(null);
  const [adding, setAdding] = useState(false);
  const [filterCasa, setFilterCasa] = useState('Todas');
  const [editingId, setEditingId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editCasaVal, setEditCasaVal] = useState('');
  const [viewingImg, setViewingImg] = useState(null);
  const fileRef = useRef();

  const filteredCPAs = useMemo(() =>
    filterCasa === 'Todas' ? cpas : cpas.filter(c => c.casa === filterCasa),
    [cpas, filterCasa]
  );

  const stats = useMemo(() => {
    let faturamento = 0, custo = 0;
    cpas.forEach(c => {
      const casa = casas.find(x => x.nome === c.casa);
      if (casa) { faturamento += casa.valor; custo += casa.custo; }
    });
    return { total: cpas.length, faturamento, custo, lucro: faturamento - custo };
  }, [cpas, casas]);

  const pct = Math.min((stats.total / (metaDiaria || 50)) * 100, 100);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX) { h = (h * MAX) / w; w = MAX; }
        if (h > MAX) { w = (w * MAX) / h; h = MAX; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        setComprovante(base64);
        setComprovantePreview(base64);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function clearComprovante() {
    setComprovante(null);
    setComprovantePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleAdd() {
    if (!selectedCasa) { showToast('⚠️ Selecione uma casa!', 'yellow'); return; }
    setAdding(true);
    try {
      await addCPA(selectedCasa, player, comprovante);
      setPlayer('');
      clearComprovante();
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
      {/* Lightbox */}
      {viewingImg && (
        <div onClick={() => setViewingImg(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <img src={viewingImg} alt="comprovante" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12 }} />
          <button onClick={() => setViewingImg(null)} style={{
            position: 'absolute', top: 16, right: 16, background: 'var(--accent)',
            border: 'none', borderRadius: '50%', width: 36, height: 36,
            color: '#fff', fontSize: 18, cursor: 'pointer'
          }}>✕</button>
        </div>
      )}

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

        {/* Upload comprovante */}
        <div style={{ marginTop: 10 }}>
          {!comprovantePreview ? (
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              padding: '9px 14px', borderRadius: 8, border: '1.5px dashed var(--border)',
              color: 'var(--text-muted)', fontSize: 13
            }}>
              📎 Anexar comprovante Pix (opcional)
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            </label>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={comprovantePreview} alt="preview" onClick={() => setViewingImg(comprovantePreview)}
                style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid var(--accent)' }} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Comprovante anexado ✅</span>
              <button onClick={clearComprovante} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
          )}
        </div>

        <button className="btn-primary btn-full" style={{ marginTop: 12 }} onClick={handleAdd} disabled={adding}>
          {adding ? 'Registrando...' : '+ Registrar CPA'}
        </button>
      </div>

      {/* Filter chips */}
      <div className="chips">
        {['Todas', ...casas.map(c => c.nome)].map(nome => (
          <div key={nome} className={`chip${filterCasa === nome ? ' active' : ''}`} onClick={() => setFilterCasa(nome)}>{nome}</div>
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
                  {cpa.comprovante && (
                    <img src={cpa.comprovante} alt="comprovante" onClick={() => setViewingImg(cpa.comprovante)}
                      style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', flexShrink: 0, border: '1.5px solid var(--accent)' }} />
                  )}
                  <div className="cpa-info">
                    <div className="cpa-nome">{cpa.player || 'CPA sem nome'}</div>
                    <div className="cpa-meta">
                      <span>{formatTime(cpa.createdAt)}</span>
                      <span className="casa-tag">{cpa.casa}</span>
                      {cpa.comprovante && <span style={{ color: 'var(--green)', fontSize: 11 }}>📎 comprovante</span>}
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
