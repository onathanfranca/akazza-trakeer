// src/pages/MeuPainel.js
import React, { useState, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useCPAs } from '../hooks/useCPAs';
import { useToast } from '../context/ToastContext';

function today() { return format(new Date(), 'yyyy-MM-dd'); }

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX) { h = (h * MAX) / w; w = MAX; }
        if (h > MAX) { w = (w * MAX) / h; h = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function MeuPainel({ casas, metaDiaria }) {
  const { currentUser } = useAuth();
  const { showCPAToast, showToast } = useToast();

  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [applied, setApplied] = useState({ from: today(), to: today() });

  const { cpas, loading, addCPA, removeCPA, editCPA } = useCPAs(currentUser?.uid, applied.from, applied.to);

  const [selectedCasa, setSelectedCasa] = useState('');
  const [player, setPlayer] = useState('');
  const [comprovantes, setComprovantes] = useState([]); // array de base64, max 4
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

  async function handleFileChange(e) {
    const files = Array.from(e.target.files);
    const remaining = 4 - comprovantes.length;
    if (remaining <= 0) { showToast('Máximo de 4 comprovantes!', 'yellow'); return; }
    const toProcess = files.slice(0, remaining);
    const compressed = await Promise.all(toProcess.map(compressImage));
    setComprovantes(prev => [...prev, ...compressed]);
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeComprovante(idx) {
    setComprovantes(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleAdd() {
    if (!selectedCasa) { showToast('⚠️ Selecione uma casa!', 'yellow'); return; }
    setAdding(true);
    try {
      await addCPA(selectedCasa, player, comprovantes);
      setPlayer('');
      setComprovantes([]);
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

  // Compatibilidade: suporta campo antigo comprovante (string) e novo comprovantes (array)
  function getComprovantes(cpa) {
    if (cpa.comprovantes && cpa.comprovantes.length > 0) return cpa.comprovantes;
    if (cpa.comprovante) return [cpa.comprovante];
    return [];
  }

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

        {/* Upload comprovantes */}
        <div style={{ marginTop: 10 }}>
          {/* Thumbnails */}
          {comprovantes.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {comprovantes.map((img, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img src={img} alt={`comprovante ${idx+1}`} onClick={() => setViewingImg(img)}
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid var(--accent)' }} />
                  <button onClick={() => removeComprovante(idx)} style={{
                    position: 'absolute', top: -6, right: -6, background: 'var(--accent)',
                    border: 'none', borderRadius: '50%', width: 20, height: 20,
                    color: '#fff', fontSize: 11, cursor: 'pointer', lineHeight: '20px', padding: 0
                  }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Botão adicionar */}
          {comprovantes.length < 4 && (
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              padding: '9px 14px', borderRadius: 8, border: '1.5px dashed var(--border)',
              color: 'var(--text-muted)', fontSize: 13
            }}>
              📎 {comprovantes.length === 0 ? 'Anexar comprovante(s) Pix' : `Adicionar mais (${comprovantes.length}/4)`}
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
            </label>
          )}
          {comprovantes.length === 4 && (
            <span style={{ fontSize: 12, color: 'var(--green)' }}>✅ Máximo de 4 comprovantes anexados</span>
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
            const imgs = getComprovantes(cpa);
            return (
              <div key={cpa.id}>
                <div className="cpa-item">
                  {/* Thumbnails no histórico */}
                  {imgs.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {imgs.map((img, idx) => (
                        <img key={idx} src={img} alt="comprovante" onClick={() => setViewingImg(img)}
                          style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1.5px solid var(--accent)' }} />
                      ))}
                    </div>
                  )}
                  <div className="cpa-info">
                    <div className="cpa-nome">{cpa.player || 'CPA sem nome'}</div>
                    <div className="cpa-meta">
                      <span>{formatTime(cpa.createdAt)}</span>
                      <span className="casa-tag">{cpa.casa}</span>
                      {imgs.length > 0 && <span style={{ color: 'var(--green)', fontSize: 11 }}>📎 {imgs.length} comprovante{imgs.length > 1 ? 's' : ''}</span>}
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
