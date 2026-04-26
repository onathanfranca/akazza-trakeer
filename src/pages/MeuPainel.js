// src/pages/MeuPainel.js
import React, { useState, useMemo, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useCPAs } from '../hooks/useCPAs';
import { useToast } from '../context/ToastContext';

function today() { return format(new Date(), 'yyyy-MM-dd'); }
function daysAgo(n) { return format(subDays(new Date(), n), 'yyyy-MM-dd'); }

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

// Respeita o role do usuário
function getValorCasa(casa, isAdmin) {
  if (!casa) return 0;
  if (isAdmin) return casa.valorAdmin ?? casa.valor ?? 0;
  return casa.valorAfiliado ?? casa.valor ?? 0;
}

function fmtVal(n) {
  return `R$ ${Number(Math.abs(n || 0)).toLocaleString('pt-BR')}`;
}

function formatTime(ts) {
  if (!ts) return '--:--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'HH:mm');
}

export default function MeuPainel({ casas, metaDiaria }) {
  const { currentUser, userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';
  const { showCPAToast, showToast } = useToast();

  const [periodo, setPeriodo] = useState('7d');
  const [dateFrom, setDateFrom] = useState(daysAgo(6));
  const [dateTo, setDateTo] = useState(today());
  const [applied, setApplied] = useState({ from: daysAgo(6), to: today() });

  const { cpas, loading, addCPA, removeCPA, editCPA } = useCPAs(currentUser?.uid, applied.from, applied.to);

  const [selectedCasa, setSelectedCasa] = useState('');
  const [depositante, setDepositante] = useState('');
  const [valorDeposito, setValorDeposito] = useState('');
  const [comprovantes, setComprovantes] = useState([]);
  const [adding, setAdding] = useState(false);
  const [filterCasa, setFilterCasa] = useState('Todas');
  const [editingId, setEditingId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editCasaVal, setEditCasaVal] = useState('');
  const [editImgs, setEditImgs] = useState([]);
  const [savingImgs, setSavingImgs] = useState(false);
  const [viewingImg, setViewingImg] = useState(null);
  const fileRef = useRef();
  const editFileRef = useRef();

  const filteredCPAs = useMemo(() =>
    filterCasa === 'Todas' ? cpas : cpas.filter(c => c.casa === filterCasa),
    [cpas, filterCasa]
  );

  // 4 blocos: CPAs, Faturamento, Custo (deposito), Lucro
  const stats = useMemo(() => {
    let faturamento = 0, custo = 0;
    cpas.forEach(c => {
      if (c.valorCPA != null) {
        faturamento += Number(c.valorCPA);
      } else {
        const casa = casas.find(x => x.nome === c.casa);
        faturamento += getValorCasa(casa, isAdmin);
      }
      custo += Number(c.valorDeposito || 0);
    });
    return { total: cpas.length, faturamento, custo, lucro: faturamento - custo };
  }, [cpas, casas, isAdmin]);

  const pct = Math.min((stats.total / (metaDiaria || 50)) * 100, 100);

  async function handleFileChange(e) {
    const files = Array.from(e.target.files);
    const remaining = 4 - comprovantes.length;
    if (remaining <= 0) { showToast('Máximo de 4 comprovantes!', 'yellow'); return; }
    const compressed = await Promise.all(files.slice(0, remaining).map(compressImage));
    setComprovantes(prev => [...prev, ...compressed]);
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeComprovante(idx) {
    setComprovantes(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleAdd() {
    if (!selectedCasa) { showToast('⚠️ Selecione uma casa!', 'yellow'); return; }
    if (!depositante.trim()) { showToast('⚠️ Nome do depositante é obrigatório!', 'yellow'); return; }
    if (!valorDeposito || Number(valorDeposito) <= 0) { showToast('⚠️ Informe o valor do depósito!', 'yellow'); return; }
    if (comprovantes.length === 0) { showToast('⚠️ Anexe pelo menos 1 comprovante!', 'yellow'); return; }

    // Congela valorCPA pelo role do usuário no momento do registro
    const casa = casas.find(c => c.nome === selectedCasa);
    const valorCPA = getValorCasa(casa, isAdmin);

    setAdding(true);
    try {
      await addCPA(selectedCasa, depositante.trim(), comprovantes, valorCPA, Number(valorDeposito));
      setDepositante('');
      setValorDeposito('');
      setComprovantes([]);
      showCPAToast(selectedCasa);
    } catch { showToast('Erro ao registrar CPA.', 'red'); }
    setAdding(false);
  }

  async function handleRemove(id) {
    try { await removeCPA(id); showToast('CPA removido.', 'yellow'); }
    catch { showToast('Erro ao remover.', 'red'); }
  }

  function getComprovantes(cpa) {
    if (cpa.comprovantes?.length > 0) return cpa.comprovantes;
    if (cpa.comprovante) return [cpa.comprovante];
    return [];
  }

  function startEdit(cpa) {
    setEditingId(cpa.id);
    setEditNome(cpa.player || '');
    setEditCasaVal(cpa.casa);
    setEditImgs(getComprovantes(cpa));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditImgs([]);
    if (editFileRef.current) editFileRef.current.value = '';
  }

  async function handleEditFileChange(e) {
    const files = Array.from(e.target.files);
    const remaining = 4 - editImgs.length;
    if (remaining <= 0) { showToast('Máximo de 4!', 'yellow'); return; }
    const compressed = await Promise.all(files.slice(0, remaining).map(compressImage));
    setEditImgs(prev => [...prev, ...compressed]);
    if (editFileRef.current) editFileRef.current.value = '';
  }

  function removeEditImg(idx) {
    setEditImgs(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveEdit(id) {
    setSavingImgs(true);
    try {
      await editCPA(id, { player: editNome, casa: editCasaVal, comprovantes: editImgs, comprovante: null });
      showToast('✅ CPA atualizado!', 'green');
      cancelEdit();
    } catch { showToast('Erro ao atualizar.', 'red'); }
    setSavingImgs(false);
  }

  return (
    <div className="fade-in">
      {/* Lightbox */}
      {viewingImg && (
        <div onClick={() => setViewingImg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <img src={viewingImg} alt="comprovante" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12 }} />
        </div>
      )}

      {/* Date Filter */}
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

      {/* 4 blocos */}
      <div className="resumo-grid">
        <div className="resumo-card"><div className="resumo-label">CPAs</div><div className="resumo-val white">{stats.total}</div></div>
        <div className="resumo-card"><div className="resumo-label">Faturamento</div><div className="resumo-val yellow">{fmtVal(stats.faturamento)}</div></div>
        <div className="resumo-card"><div className="resumo-label">Custo (Dep.)</div><div className="resumo-val red">{fmtVal(stats.custo)}</div></div>
        <div className="resumo-card"><div className="resumo-label">Lucro</div><div className="resumo-val" style={{ color: stats.lucro < 0 ? 'var(--accent)' : 'var(--green)' }}>{fmtVal(stats.lucro)}</div></div>
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
          <div style={{ position: 'relative' }}>
            <input className="input-field" type="text" placeholder="Nome do depositante *"
              value={depositante} onChange={e => setDepositante(e.target.value)}
              style={{ borderColor: depositante.trim() ? 'var(--border)' : 'var(--accent)' }} />
            {!depositante.trim() && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--accent)' }}>obrigatório</span>}
          </div>
        </div>

        {/* Valor do depósito */}
        <div style={{ marginTop: 8, position: 'relative' }}>
          <input className="input-field" type="number" min="0" step="0.01"
            placeholder="Valor do depósito (R$) *"
            value={valorDeposito} onChange={e => setValorDeposito(e.target.value)}
            style={{ borderColor: (!valorDeposito || Number(valorDeposito) <= 0) ? 'var(--accent)' : 'var(--border)' }} />
          {(!valorDeposito || Number(valorDeposito) <= 0) && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--accent)' }}>obrigatório</span>}
        </div>

        {/* Comprovantes */}
        <div style={{ marginTop: 10 }}>
          {comprovantes.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {comprovantes.map((img, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img src={img} alt={`comp ${idx+1}`} onClick={() => setViewingImg(img)}
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid var(--accent)' }} />
                  <button onClick={() => removeComprovante(idx)} style={{ position: 'absolute', top: -6, right: -6, background: 'var(--accent)', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', fontSize: 11, cursor: 'pointer', lineHeight: '20px', padding: 0 }}>✕</button>
                </div>
              ))}
            </div>
          )}
          {comprovantes.length < 4 ? (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '9px 14px', borderRadius: 8, border: `1.5px dashed ${comprovantes.length === 0 ? 'var(--accent)' : 'var(--border)'}`, color: comprovantes.length === 0 ? 'var(--accent)' : 'var(--muted)', fontSize: 13 }}>
              📎 {comprovantes.length === 0 ? 'Anexar comprovante Pix *' : `Adicionar mais (${comprovantes.length}/4)`}
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
            </label>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--green)' }}>✅ Máximo de 4 comprovantes</span>
          )}
        </div>

        {/* Preview valor CPA congelado */}
        {selectedCasa && (() => {
          const casa = casas.find(c => c.nome === selectedCasa);
          const val = getValorCasa(casa, isAdmin);
          return val > 0 ? (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, fontSize: 13, color: 'var(--muted)' }}>
              💰 Valor do CPA: <strong style={{ color: 'var(--accent)' }}>R$ {val.toLocaleString('pt-BR')}</strong> <span style={{ fontSize: 11 }}>(será congelado no registro)</span>
            </div>
          ) : null;
        })()}

        <button className="btn-primary btn-full" style={{ marginTop: 12 }} onClick={handleAdd} disabled={adding}>
          {adding ? 'Registrando...' : '+ Registrar CPA'}
        </button>
      </div>

      {/* Chips */}
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
            const valorExibido = cpa.valorCPA != null ? Number(cpa.valorCPA) : getValorCasa(casa, isAdmin);
            const imgs = getComprovantes(cpa);
            const isEditing = editingId === cpa.id;
            return (
              <div key={cpa.id}>
                <div className="cpa-item">
                  {!isEditing && imgs.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {imgs.map((img, idx) => (
                        <img key={idx} src={img} alt="comp" onClick={() => setViewingImg(img)}
                          style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1.5px solid var(--accent)' }} />
                      ))}
                    </div>
                  )}
                  <div className="cpa-info">
                    <div className="cpa-nome">{cpa.player || 'Sem depositante'}</div>
                    <div className="cpa-meta">
                      <span>{formatTime(cpa.createdAt)}</span>
                      <span className="casa-tag">{cpa.casa}</span>
                      {cpa.valorDeposito > 0 && <span style={{ color: 'var(--muted)', fontSize: 11 }}>Dep: R$ {Number(cpa.valorDeposito).toLocaleString('pt-BR')}</span>}
                      {imgs.length > 0 && !isEditing && <span style={{ color: 'var(--green)', fontSize: 11 }}>📎 {imgs.length}</span>}
                    </div>
                  </div>
                  <div className="cpa-actions">
                    <span className="cpa-valor" style={{ color: valorExibido < 0 ? 'var(--accent)' : 'var(--accent)' }}>
                      {fmtVal(valorExibido)}
                    </span>
                    <button className="btn-icon" onClick={() => isEditing ? cancelEdit() : startEdit(cpa)}>✏️</button>
                    <button className="btn-danger" onClick={() => handleRemove(cpa.id)}>✕</button>
                  </div>
                </div>

                {isEditing && (
                  <div className="cpa-edit-row" style={{ flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div className="input-small-label">Depositante</div>
                        <input className="input-edit" value={editNome} onChange={e => setEditNome(e.target.value)} placeholder="Nome do depositante" />
                      </div>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div className="input-small-label">Casa</div>
                        <select className="input-edit" value={editCasaVal} onChange={e => setEditCasaVal(e.target.value)}>
                          {casas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <div className="input-small-label">Comprovantes ({editImgs.length}/4)</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                        {editImgs.map((img, idx) => (
                          <div key={idx} style={{ position: 'relative' }}>
                            <img src={img} alt={`comp ${idx+1}`} onClick={() => setViewingImg(img)}
                              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid var(--accent)' }} />
                            <button onClick={() => removeEditImg(idx)} style={{ position: 'absolute', top: -6, right: -6, background: '#e53', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', fontSize: 11, cursor: 'pointer', lineHeight: '20px', padding: 0 }}>✕</button>
                          </div>
                        ))}
                        {editImgs.length < 4 && (
                          <label style={{ width: 56, height: 56, borderRadius: 8, border: '1.5px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: 22 }}>
                            +
                            <input ref={editFileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleEditFileChange} />
                          </label>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-save" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => handleSaveEdit(cpa.id)} disabled={savingImgs}>
                        {savingImgs ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button className="btn-secondary" style={{ padding: '7px 10px', fontSize: 12 }} onClick={cancelEdit}>Cancelar</button>
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
