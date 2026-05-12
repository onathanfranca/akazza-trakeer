// src/pages/Fechamento.js
import React, { useState, useMemo } from 'react';
import { format, subDays, parseISO, startOfDay, endOfDay } from 'date-fns';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useFechamentos } from '../hooks/useAdmin';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { registrarLog } from '../utils/logs';

function today() { return format(new Date(), 'yyyy-MM-dd'); }
function daysAgo(n) { return format(subDays(new Date(), n), 'yyyy-MM-dd'); }
function fmtVal(n) { return `R$ ${Number(Math.abs(n || 0)).toLocaleString('pt-BR')}`; }
function fmtDate(str) {
  if (!str) return '--';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}
function fmtTs(ts) {
  if (!ts) return '--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'dd/MM/yyyy HH:mm');
}

function getValorCPA(cpa, casa, userRole) {
  if (cpa.valorCPA != null) return Number(cpa.valorCPA);
  if (!casa) return 0;
  if (userRole === 'admin') return casa.valorAdmin ?? casa.valor ?? 0;
  return casa.valorAfiliado ?? casa.valor ?? 0;
}

function exportarCSV(fechamentos, nomeAfiliado = null) {
  const linhas = [['Afiliado', 'Período início', 'Período fim', 'CPAs', 'Faturamento (R$)', 'Valor pago (R$)', 'Observação', 'Registrado em']];
  fechamentos.forEach(f => {
    const criadoEm = f.criadoEm ? (f.criadoEm.toDate ? f.criadoEm.toDate() : new Date(f.criadoEm)) : null;
    linhas.push([f.nomeAfiliado || '', fmtDate(f.dateFrom), fmtDate(f.dateTo), f.totalCPAs ?? 0, Number(f.faturamento || 0).toFixed(2).replace('.', ','), Number(f.valorPago || 0).toFixed(2).replace('.', ','), f.observacao || '', criadoEm ? format(criadoEm, 'dd/MM/yyyy HH:mm') : '--']);
  });
  const csv = linhas.map(row => row.map(cel => `"${String(cel).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const sufixo = nomeAfiliado ? `_${nomeAfiliado.replace(/\s+/g, '_')}` : '';
  a.href = url;
  a.download = `fechamentos${sufixo}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Fechamento({ users, casas, tenantId }) {
  const { showToast } = useToast();
  const { currentUser, userProfile } = useAuth();
  const { fechamentos, loading: loadingFech, criarFechamento, deletarFechamento } = useFechamentos(tenantId);

  const [selectedUid, setSelectedUid] = useState('');
  const [dateFrom, setDateFrom] = useState(daysAgo(6));
  const [dateTo, setDateTo] = useState(today());
  const [valorPago, setValorPago] = useState('');
  const [observacao, setObservacao] = useState('');
  const [calculando, setCalculando] = useState(false);
  const [preview, setPreview] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [filtroAfiliado, setFiltroAfiliado] = useState('todos');

  const afiliados = useMemo(() => users.filter(u => u.role === 'afiliado'), [users]);

  async function handleCalcular() {
    if (!selectedUid) { showToast('⚠️ Selecione um afiliado!', 'yellow'); return; }
    if (!dateFrom || !dateTo) { showToast('⚠️ Defina o período!', 'yellow'); return; }

    setCalculando(true);
    try {
      const from = Timestamp.fromDate(startOfDay(parseISO(dateFrom)));
      const to = Timestamp.fromDate(endOfDay(parseISO(dateTo)));
      const q = query(
        collection(db, 'cpas'),
        where('tenantId', '==', tenantId),
        where('uid', '==', selectedUid),
        where('createdAt', '>=', from),
        where('createdAt', '<=', to),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const cpas = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const user = users.find(u => u.uid === selectedUid);
      let faturamento = 0, totalAprovados = 0, totalPendentes = 0, totalRejeitados = 0;

      cpas.forEach(cpa => {
        if (cpa.status === 'rejeitado') { totalRejeitados++; return; }
        if (cpa.status === 'pendente') { totalPendentes++; return; }
        totalAprovados++;
        const casa = casas.find(c => c.nome === cpa.casa);
        faturamento += getValorCPA(cpa, casa, user?.role || 'afiliado');
      });

      setPreview({ uid: selectedUid, nomeAfiliado: user?.nome || '', dateFrom, dateTo, totalCPAs: totalAprovados, totalPendentes, totalRejeitados, faturamento });
    } catch (err) {
      console.error(err);
      showToast('Erro ao calcular.', 'red');
    }
    setCalculando(false);
  }

  async function handleSalvar() {
    if (!preview) return;
    if (!valorPago || Number(valorPago) <= 0) { showToast('⚠️ Informe o valor pago!', 'yellow'); return; }
    setSalvando(true);
    try {
      await criarFechamento({ ...preview, valorPago: Number(valorPago), observacao });
      await registrarLog(tenantId, {
        uid: currentUser.uid,
        nome: userProfile?.nome || '',
        acao: 'fechamento_criado',
        detalhe: `${preview.nomeAfiliado} — ${preview.totalCPAs} CPAs — R$ ${Number(valorPago).toLocaleString('pt-BR')}`,
      });
      showToast('✅ Fechamento registrado!', 'green');
      setPreview(null); setValorPago(''); setObservacao(''); setSelectedUid('');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar fechamento.', 'red');
    }
    setSalvando(false);
  }

  async function handleDeletar(id, nome) {
    if (!window.confirm(`Remover fechamento de ${nome}?`)) return;
    try { await deletarFechamento(id); showToast('Fechamento removido.', 'yellow'); }
    catch { showToast('Erro ao remover.', 'red'); }
  }

  const fechamentosFiltrados = useMemo(() =>
    filtroAfiliado === 'todos' ? fechamentos : fechamentos.filter(f => f.uid === filtroAfiliado),
    [fechamentos, filtroAfiliado]
  );

  const nomeAfiliadoFiltro = useMemo(() => {
    if (filtroAfiliado === 'todos') return null;
    return afiliados.find(u => u.uid === filtroAfiliado)?.nome || null;
  }, [filtroAfiliado, afiliados]);

  return (
    <div className="fade-in">
      <div className="manage-box">
        <div className="manage-title">💰 Novo Fechamento</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="input-small-label">Afiliado</div>
            <select className="input-field" value={selectedUid} onChange={e => { setSelectedUid(e.target.value); setPreview(null); }}>
              <option value="">Selecione o afiliado...</option>
              {afiliados.map(u => <option key={u.uid} value={u.uid}>{u.nome}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div className="input-small-label">Data início</div>
              <input type="date" className="input-field" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPreview(null); }} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div className="input-small-label">Data fim</div>
              <input type="date" className="input-field" value={dateTo} onChange={e => { setDateTo(e.target.value); setPreview(null); }} />
            </div>
          </div>
          <button className="btn-secondary" style={{ alignSelf: 'flex-start', padding: '9px 20px' }} onClick={handleCalcular} disabled={calculando}>
            {calculando ? '⏳ Calculando...' : '🔍 Calcular período'}
          </button>

          {preview && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--accent)' }}>
                📊 {preview.nomeAfiliado} — {fmtDate(preview.dateFrom)} a {fmtDate(preview.dateTo)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 8 }}>
                <div className="resumo-card"><div className="resumo-label">CPAs Aprovados</div><div className="resumo-val white">{preview.totalCPAs}</div></div>
                <div className="resumo-card"><div className="resumo-label">Faturamento</div><div className="resumo-val yellow">{fmtVal(preview.faturamento)}</div></div>
              </div>
              {(preview.totalPendentes > 0 || preview.totalRejeitados > 0) && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {preview.totalPendentes > 0 && (
                    <span style={{ fontSize: 12, background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44', borderRadius: 6, padding: '4px 10px' }}>
                      ⏳ {preview.totalPendentes} pendente{preview.totalPendentes > 1 ? 's' : ''} (não incluído{preview.totalPendentes > 1 ? 's' : ''})
                    </span>
                  )}
                  {preview.totalRejeitados > 0 && (
                    <span style={{ fontSize: 12, background: 'var(--red)22', color: 'var(--red)', border: '1px solid var(--red)44', borderRadius: 6, padding: '4px 10px' }}>
                      ❌ {preview.totalRejeitados} rejeitado{preview.totalRejeitados > 1 ? 's' : ''} (não incluído{preview.totalRejeitados > 1 ? 's' : ''})
                    </span>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div className="input-small-label">Valor pago (R$) *</div>
                  <input className="input-field" type="number" min="0" step="0.01" placeholder="Ex: 850.00"
                    value={valorPago} onChange={e => setValorPago(e.target.value)}
                    style={{ borderColor: (!valorPago || Number(valorPago) <= 0) ? 'var(--accent)' : 'var(--border)' }} />
                </div>
                <div style={{ flex: 2, minWidth: 200 }}>
                  <div className="input-small-label">Observação (opcional)</div>
                  <input className="input-field" type="text" placeholder="Ex: Saque semana 1 — Abril"
                    value={observacao} onChange={e => setObservacao(e.target.value)} />
                </div>
              </div>
              <button className="btn-primary" style={{ marginTop: 14, width: '100%' }} onClick={handleSalvar} disabled={salvando}>
                {salvando ? 'Salvando...' : '✅ Confirmar Fechamento'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="manage-box">
        <div className="manage-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span>📋 Histórico de Fechamentos</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="input-field" style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }}
              value={filtroAfiliado} onChange={e => setFiltroAfiliado(e.target.value)}>
              <option value="todos">Todos os afiliados</option>
              {afiliados.map(u => <option key={u.uid} value={u.uid}>{u.nome}</option>)}
            </select>
            {fechamentosFiltrados.length > 0 && (
              <button onClick={() => exportarCSV(fechamentosFiltrados, nomeAfiliadoFiltro)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}>
                📥 Exportar CSV
              </button>
            )}
          </div>
        </div>

        {loadingFech ? (
          <div className="loading-wrap"><div className="spinner" /><span className="loading-text">Carregando...</span></div>
        ) : fechamentosFiltrados.length === 0 ? (
          <div className="empty" style={{ padding: '20px 0' }}><div className="empty-icon">📭</div>Nenhum fechamento registrado.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fechamentosFiltrados.map(f => (
              <div key={f.id} style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{f.nomeAfiliado}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDate(f.dateFrom)} → {fmtDate(f.dateTo)} • Registrado em {fmtTs(f.criadoEm)}</div>
                    {f.observacao && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>📝 {f.observacao}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: 'var(--green)', color: '#000', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>✅ PAGO</span>
                    <button className="btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleDeletar(f.id, f.nomeAfiliado)}>✕</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <div className="resumo-card" style={{ padding: '8px 12px' }}><div className="resumo-label">CPAs</div><div className="resumo-val white" style={{ fontSize: 20 }}>{f.totalCPAs}</div></div>
                  <div className="resumo-card" style={{ padding: '8px 12px' }}><div className="resumo-label">Faturamento</div><div className="resumo-val yellow" style={{ fontSize: 16 }}>{fmtVal(f.faturamento)}</div></div>
                  <div className="resumo-card" style={{ padding: '8px 12px' }}><div className="resumo-label">Valor Pago</div><div className="resumo-val green" style={{ fontSize: 16 }}>{fmtVal(f.valorPago)}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}