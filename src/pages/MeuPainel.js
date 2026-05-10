// src/pages/MeuPainel.js
import React, { useState, useMemo, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useCPAs } from '../hooks/useCPAs';
import { useToast } from '../context/ToastContext';
import { ComprovanteThumbnail, ComprovanteViewer, getComprovantesNormalizados } from '../components/Comprovantes';
import CPAChart from '../components/CPAChart';

function today() { return format(new Date(), 'yyyy-MM-dd'); }
function daysAgo(n) { return format(subDays(new Date(), n), 'yyyy-MM-dd'); }

function getValorPorRole(casa, role) {
  if (!casa) return 0;
  if (role === 'admin') return casa?.valorAdmin ?? casa?.valor ?? 0;
  return casa?.valorAfiliado ?? casa?.valor ?? 0;
}

function fmtVal(n) { return `R$ ${Number(Math.abs(n || 0)).toLocaleString('pt-BR')}`; }

function previewImagem(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve({ file, preview: ev.target.result });
    reader.readAsDataURL(file);
  });
}

const STATUS_FILTROS = [
  { key: 'todos',     label: 'Todos' },
  { key: 'aprovado',  label: '✅ Aprovados' },
  { key: 'pendente',  label: '⏳ Pendentes' },
  { key: 'rejeitado', label: '❌ Rejeitados' },
];

export default function MeuPainel({ casas, metaDiaria }) {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const { showCPAToast, showToast } = useToast();

  const [periodo, setPeriodo] = useState('7d');
  const [dateFrom, setDateFrom] = useState(daysAgo(6));
  const [dateTo, setDateTo] = useState(today());
  const [applied, setApplied] = useState({ from: daysAgo(6), to: today() });

  const { cpas, loading, addCPA, removeCPA, editCPA } = useCPAs(currentUser?.uid, applied.from, applied.to);

  const [selectedCasa, setSelectedCasa] = useState('');
  const [depositante, setDepositante] = useState('');
  const [valorDeposito, setValorDeposito] = useState('');
  const [imagens, setImagens] = useState([]);
  const [adding, setAdding] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [filterCasa, setFilterCasa] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('todos'); // ← novo
  const [editingId, setEditingId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editCasaVal, setEditCasaVal] = useState('');
  const [editImgs, setEditImgs] = useState([]);
  const [savingImgs, setSavingImgs] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [pagina, setPagina] = useState(20);
  const fileRef = useRef();
  const editFileRef = useRef();

  // Contadores por status (sobre todos os CPAs do período, sem filtro de casa)
  const statusCount = useMemo(() => {
    const counts = { aprovado: 0, pendente: 0, rejeitado: 0 };
    cpas.forEach(c => {
      const s = c.status || 'aprovado';
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [cpas]);

  const filteredCPAs = useMemo(() => {
    setPagina(20);
    return cpas.filter(c => {
      if (filterCasa !== 'Todas' && c.casa !== filterCasa) return false;
      if (filterStatus !== 'todos') {
        const s = c.status || 'aprovado';
        if (s !== filterStatus) return false;
      }
      return true;
    });
  }, [cpas, filterCasa, filterStatus]);

  const cpasPaginados = filteredCPAs.slice(0, pagina);
  const temMais = filteredCPAs.length > pagina;

  const stats = useMemo(() => {
    let faturamento = 0, custo = 0, totalAprovados = 0;
    cpas.forEach(c => {
      if (c.status === 'pendente' || c.status === 'rejeitado') return;
      totalAprovados++;
      faturamento += c.valorCPA != null ? Number(c.valorCPA) : getValorPorRole(casas.find(x => x.nome === c.casa), userProfile?.role);
      custo += Number(c.valorDeposito || 0);
    });
    return { total: totalAprovados, totalTodos: cpas.length, faturamento, custo, lucro: faturamento - custo };
  }, [cpas, casas]);

  const pct = Math.min((stats.total / (metaDiaria || 50)) * 100, 100);

  async function handleFileChange(e) {
    const files = Array.from(e.target.files);
    const remaining = 4 - imagens.length;
    if (remaining <= 0) { showToast('Máximo de 4 comprovantes!', 'yellow'); return; }
    const previews = await Promise.all(files.slice(0, remaining).map(previewImagem));
    setImagens(prev => [...prev, ...previews]);
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeImagem(idx) {
    setImagens(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleAdd() {
    if (!selectedCasa) { showToast('⚠️ Selecione uma casa!', 'yellow'); return; }
    if (!depositante.trim()) { showToast('⚠️ Nome do depositante é obrigatório!', 'yellow'); return; }
    if (!valorDeposito || Number(valorDeposito) <= 0) { showToast('⚠️ Informe o valor do depósito!', 'yellow'); return; }
    if (imagens.length === 0) { showToast('⚠️ Anexe pelo menos 1 comprovante!', 'yellow'); return; }

    const casa = casas.find(c => c.nome === selectedCasa);
    const valorCPA = getValorPorRole(casa, userProfile?.role);

    setAdding(true);
    setUploadProgress('Enviando comprovantes...');
    try {
      await addCPA(selectedCasa, depositante.trim(), imagens.map(i => i.file), valorCPA, Number(valorDeposito));
      setDepositante('');
      setValorDeposito('');
      setImagens([]);
      setUploadProgress('');
      showCPAToast();
    } catch (err) {
      console.error(err);
      showToast('Erro ao registrar CPA.', 'red');
      setUploadProgress('');
    }
    setAdding(false);
  }

  async function handleRemove(id, nomeDepositante) {
    const nome = nomeDepositante || 'este CPA';
    if (!window.confirm(`Remover "${nome}"? Esta ação não pode ser desfeita.`)) return;
    try { await removeCPA(id); showToast('CPA removido.', 'yellow'); }
    catch { showToast('Erro ao remover.', 'red'); }
  }

  const getComprovantes = getComprovantesNormalizados;

  function getImgSrc(img) {
    if (typeof img === 'string') return img;
    if (img?.preview) return img.preview;
    if (img?.url) return img.url;
    return '';
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
    const previews = await Promise.all(files.slice(0, remaining).map(previewImagem));
    setEditImgs(prev => [...prev, ...previews]);
    if (editFileRef.current) editFileRef.current.value = '';
  }

  function removeEditImg(idx) {
    setEditImgs(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveEdit(id) {
    setSavingImgs(true);
    try {
      const existingUrls = editImgs.filter(i => typeof i === 'string');
      const newFiles = editImgs.filter(i => typeof i === 'object' && i.file).map(i => i.file);
      const allImagens = [...existingUrls, ...newFiles];
      await editCPA(id, {
        player: editNome,
        casa: editCasaVal,
        comprovantes: allImagens,
        comprovante: null,
      });
      showToast('✅ CPA atualizado!', 'green');
      cancelEdit();
    } catch { showToast('Erro ao atualizar.', 'red'); }
    setSavingImgs(false);
  }

  function formatTime(ts) {
    if (!ts) return '--:--';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return format(d, 'HH:mm');
  }

  return (
    <div className="fade-in">
      {viewingItem && <ComprovanteViewer item={viewingItem} onClose={() => setViewingItem(null)} />}

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
              border: periodo === opt.value ? '2px solid var(--accent)' : '1.5px solid var(--glass-border)',
              background: periodo === opt.value ? 'var(--accent)' : 'var(--glass-bg)',
              color: periodo === opt.value ? '#000' : 'var(--text)', transition: 'all .15s',
              backdropFilter: 'blur(12px)',
              boxShadow: periodo === opt.value ? '0 0 12px rgba(201,168,76,0.3)' : 'none',
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

      {/* Gráfico */}
      <CPAChart
        cpas={cpas}
        dateFrom={applied.from}
        dateTo={applied.to}
        casas={casas}
        userRole={userProfile?.role || 'afiliado'}
      />

      {/* Stats */}
      <div className="resumo-grid">
        <div className="resumo-card"><div className="resumo-label">CPAs</div><div className="resumo-val white">{stats.total}</div></div>
        <div className="resumo-card"><div className="resumo-label">Faturamento</div><div className="resumo-val yellow">{fmtVal(stats.faturamento)}</div></div>
        <div className="resumo-card"><div className="resumo-label">Custo (Dep.)</div><div className="resumo-val red">{fmtVal(stats.custo)}</div></div>
        <div className="resumo-card"><div className="resumo-label">Lucro</div><div className="resumo-val" style={{ color: stats.lucro < 0 ? 'var(--red)' : 'var(--green)', textShadow: stats.lucro < 0 ? '0 0 10px rgba(229,57,53,0.35)' : '0 0 10px rgba(26,170,110,0.4)' }}>{fmtVal(stats.lucro)}</div></div>
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

        <div style={{ marginTop: 8 }}>
          <div style={{ position: 'relative' }}>
            <input className="input-field" type="number" min="0" step="0.01"
              placeholder="Valor do depósito (R$) *"
              value={valorDeposito} onChange={e => setValorDeposito(e.target.value)}
              style={{ borderColor: (!valorDeposito || Number(valorDeposito) <= 0) ? 'var(--accent)' : 'var(--border)' }} />
            {(!valorDeposito || Number(valorDeposito) <= 0) && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--accent)' }}>obrigatório</span>}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          {imagens.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {imagens.map((img, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img src={img.preview} alt={`comp ${idx+1}`} onClick={() => setViewingItem(img)}
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid var(--accent)' }} />
                  <button onClick={() => removeImagem(idx)} style={{ position: 'absolute', top: -6, right: -6, background: 'var(--accent)', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#000', fontSize: 11, cursor: 'pointer', lineHeight: '20px', padding: 0 }}>✕</button>
                </div>
              ))}
            </div>
          )}
          {imagens.length < 4 ? (
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              padding: '9px 14px', borderRadius: 8,
              border: `1.5px dashed ${imagens.length === 0 ? 'var(--accent)' : 'var(--glass-border)'}`,
              color: imagens.length === 0 ? 'var(--accent)' : 'var(--text-muted)', fontSize: 13
            }}>
              📎 {imagens.length === 0 ? 'Anexar comprovante Pix *' : `Adicionar mais (${imagens.length}/4)`}
              <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }} onChange={handleFileChange} />
            </label>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--green)' }}>✅ Máximo de 4 comprovantes</span>
          )}
        </div>

        {selectedCasa && (() => {
          const casa = casas.find(c => c.nome === selectedCasa);
          const val = getValorPorRole(casa, userProfile?.role);
          return val > 0 ? (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(6,6,12,0.5)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              💰 Valor do CPA: <strong style={{ color: 'var(--accent)', textShadow: '0 0 8px rgba(201,168,76,0.4)' }}>R$ {val.toLocaleString('pt-BR')}</strong> <span style={{ fontSize: 11 }}>(será congelado no registro)</span>
            </div>
          ) : null;
        })()}

        {uploadProgress && (
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--accent)', textAlign: 'center' }}>⏳ {uploadProgress}</div>
        )}

        <button className="btn-primary btn-full" style={{ marginTop: 12 }} onClick={handleAdd} disabled={adding}>
          {adding ? 'Registrando...' : '+ Registrar CPA'}
        </button>
      </div>

      {/* Filtro por casa */}
      <div className="chips">
        {['Todas', ...casas.map(c => c.nome)].map(nome => (
          <div key={nome} className={`chip${filterCasa === nome ? ' active' : ''}`} onClick={() => setFilterCasa(nome)}>{nome}</div>
        ))}
      </div>

      {/* ── Filtro por status ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, marginTop: 4 }}>
        {STATUS_FILTROS.map(f => {
          const count = f.key === 'todos' ? cpas.length : statusCount[f.key] ?? 0;
          const isActive = filterStatus === f.key;
          const borderColor = isActive
            ? f.key === 'aprovado' ? 'var(--green)'
            : f.key === 'pendente' ? '#f59e0b'
            : f.key === 'rejeitado' ? 'var(--red)'
            : 'var(--accent)'
            : 'var(--border)';
          const bgColor = isActive
            ? f.key === 'aprovado' ? 'rgba(26,170,110,0.12)'
            : f.key === 'pendente' ? 'rgba(245,158,11,0.12)'
            : f.key === 'rejeitado' ? 'rgba(229,57,53,0.12)'
            : 'var(--glass-bg)'
            : 'var(--card)';
          return (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${borderColor}`,
                background: bgColor,
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all .15s',
              }}
            >
              {f.label}
              <span style={{
                background: isActive ? borderColor : 'var(--surface)',
                color: isActive ? (f.key === 'pendente' ? '#000' : f.key === 'todos' ? '#000' : '#fff') : 'var(--text-muted)',
                fontSize: 10, fontWeight: 700,
                padding: '1px 6px', borderRadius: 99, minWidth: 18, textAlign: 'center'
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="section-title">📋 Histórico</div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /><span className="loading-text">Carregando CPAs...</span></div>
      ) : filteredCPAs.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          {filterStatus === 'todos' ? 'Nenhum CPA neste período.' : `Nenhum CPA ${filterStatus === 'aprovado' ? 'aprovado' : filterStatus === 'pendente' ? 'pendente' : 'rejeitado'} neste período.`}
        </div>
      ) : (
        <div className="cpa-list">
          {cpasPaginados.map(cpa => {
            const casa = casas.find(c => c.nome === cpa.casa);
            const valorExibido = cpa.valorCPA != null ? Number(cpa.valorCPA) : getValorPorRole(casa, userProfile?.role);
            const imgs = getComprovantes(cpa);
            const isEditing = editingId === cpa.id;
            return (
              <div key={cpa.id}>
                <div className="cpa-item">
                  {!isEditing && imgs.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {imgs.map((img, idx) => (
                        <ComprovanteThumbnail key={idx} item={img} idx={idx} onClick={setViewingItem} size={38} />
                      ))}
                    </div>
                  )}
                  <div className="cpa-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="cpa-nome">{cpa.player || 'Sem depositante'}</div>
                      {cpa.status === 'pendente' && <span style={{ fontSize: 10, background: '#f59e0b', color: '#000', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>⏳ Pendente</span>}
                      {cpa.status === 'rejeitado' && <span style={{ fontSize: 10, background: 'var(--red)', color: '#fff', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>❌ Rejeitado</span>}
                    </div>
                    {cpa.status === 'rejeitado' && cpa.motivoRejeicao && (
                      <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>Motivo: {cpa.motivoRejeicao}</div>
                    )}
                    <div className="cpa-meta">
                      <span>{formatTime(cpa.createdAt)}</span>
                      <span className="casa-tag">{cpa.casa}</span>
                      {cpa.valorDeposito > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Dep: R$ {Number(cpa.valorDeposito).toLocaleString('pt-BR')}</span>}
                      {imgs.length > 0 && !isEditing && <span style={{ color: 'var(--green)', fontSize: 11 }}>📎 {imgs.length}</span>}
                    </div>
                  </div>
                  <div className="cpa-actions">
                    <span className="cpa-valor" style={{ color: valorExibido < 0 ? 'var(--red)' : 'var(--accent)' }}>
                      R$ {Math.abs(valorExibido).toLocaleString('pt-BR')}
                    </span>
                    <button className="btn-icon" onClick={() => isEditing ? cancelEdit() : startEdit(cpa)}>✏️</button>
                    <button className="btn-danger" onClick={() => handleRemove(cpa.id, cpa.player)}>✕</button>
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
                            <img src={getImgSrc(img)} alt={`comp ${idx+1}`} onClick={() => setViewingItem(img)}
                              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid var(--accent)' }} />
                            <button onClick={() => removeEditImg(idx)} style={{ position: 'absolute', top: -6, right: -6, background: 'var(--red)', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', fontSize: 11, cursor: 'pointer', lineHeight: '20px', padding: 0 }}>✕</button>
                          </div>
                        ))}
                        {editImgs.length < 4 && (
                          <label style={{ width: 56, height: 56, borderRadius: 8, border: '1.5px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 22 }}>
                            +
                            <input ref={editFileRef} type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }} onChange={handleEditFileChange} />
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

      {temMais && (
        <button
          onClick={() => setPagina(p => p + 20)}
          style={{
            width: '100%', marginTop: 12, padding: '12px',
            background: 'var(--glass-bg)', backdropFilter: 'blur(12px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 10, color: 'var(--text)', cursor: 'pointer',
            fontSize: 14, fontWeight: 600
          }}
        >
          Carregar mais ({filteredCPAs.length - pagina} restantes)
        </button>
      )}
    </div>
  );
}
