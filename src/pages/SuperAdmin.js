// src/pages/SuperAdmin.js
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format } from 'date-fns';

const PRECO_MENSAL = 67.90;

function fmtTs(ts) {
  if (!ts) return '--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'dd/MM/yyyy');
}

function fmtVal(n) {
  return `R$ ${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function PlanoBadge({ plano }) {
  const map = {
    ativo:    { label: '✅ Ativo',    bg: 'rgba(26,170,110,0.15)', color: 'var(--green)', border: 'var(--green)' },
    inativo:  { label: '🔒 Inativo',  bg: 'rgba(229,57,53,0.15)',  color: 'var(--red)',   border: 'var(--red)'   },
    pendente: { label: '⏳ Pendente', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b',      border: '#f59e0b'      },
  };
  const s = map[plano] || map.inativo;
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

export default function SuperAdmin() {
  const [tenants, setTenants] = useState([]);
  const [cpasCounts, setCpasCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroPlano, setFiltroPlano] = useState('todos');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tenants'), async snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTenants(lista);
      setLoading(false);

      // Busca contagem de CPAs por tenant
      const counts = {};
      await Promise.all(lista.map(async t => {
        const q = query(collection(db, 'cpas'), where('tenantId', '==', t.id));
        const s = await getDocs(q);
        counts[t.id] = s.size;
      }));
      setCpasCounts(counts);
    });
    return unsub;
  }, []);

  async function setPlano(id, plano) {
    setSalvando(id);
    try { await updateDoc(doc(db, 'tenants', id), { plano }); }
    catch (e) { console.error(e); }
    setSalvando('');
  }

  const ativos   = tenants.filter(t => t.plano === 'ativo').length;
  const inativos = tenants.filter(t => t.plano === 'inativo').length;
  const pendentes = tenants.filter(t => t.plano === 'pendente').length;
  const receitaMensal = ativos * PRECO_MENSAL;

  const filtrados = tenants
    .filter(t => filtroPlano === 'todos' || t.plano === filtroPlano)
    .filter(t => {
      const q = busca.toLowerCase();
      return !q || t.nome?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q) || t.id?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const ordem = { ativo: 0, pendente: 1, inativo: 2 };
      return (ordem[a.plano] ?? 3) - (ordem[b.plano] ?? 3);
    });

  return (
    <div className="fade-in">

      {/* Cards de resumo */}
      <div className="resumo-grid" style={{ marginBottom: 20 }}>
        <div className="resumo-card">
          <div className="resumo-label">Total de clientes</div>
          <div className="resumo-val white">{tenants.length}</div>
        </div>
        <div className="resumo-card">
          <div className="resumo-label">Ativos</div>
          <div className="resumo-val" style={{ color: 'var(--green)' }}>{ativos}</div>
        </div>
        <div className="resumo-card">
          <div className="resumo-label">Pendentes</div>
          <div className="resumo-val" style={{ color: '#f59e0b' }}>{pendentes}</div>
        </div>
        <div className="resumo-card">
          <div className="resumo-label">Receita mensal</div>
          <div className="resumo-val yellow">{fmtVal(receitaMensal)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input-field"
          placeholder="🔍 Buscar por nome, email ou ID..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <div className="chips" style={{ margin: 0 }}>
          {['todos', 'ativo', 'pendente', 'inativo'].map(f => (
            <div key={f} className={`chip${filtroPlano === f ? ' active' : ''}`} onClick={() => setFiltroPlano(f)}>
              {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /><span className="loading-text">Carregando...</span></div>
      ) : filtrados.length === 0 ? (
        <div className="empty"><div className="empty-icon">🏢</div>Nenhum tenant encontrado.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtrados.map(t => (
            <div key={t.id} style={{
              background: 'var(--card)', borderRadius: 14, padding: '16px 18px',
              border: `1px solid ${t.plano === 'ativo' ? 'rgba(26,170,110,0.2)' : t.plano === 'pendente' ? 'rgba(245,158,11,0.2)' : 'rgba(229,57,53,0.2)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{t.nome || t.adminNome || '—'}</div>
                    <PlanoBadge plano={t.plano} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                    📧 {t.email || '—'}<br />
                    🆔 {t.id}<br />
                    📅 Criado em {fmtTs(t.criadoEm || t.createdAt)}<br />
                    📊 {cpasCounts[t.id] ?? '...'} CPAs registrados
                  </div>
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  {t.plano !== 'ativo' && (
                    <button onClick={() => setPlano(t.id, 'ativo')} disabled={salvando === t.id} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'rgba(26,170,110,0.2)', color: 'var(--green)' }}>
                      {salvando === t.id ? '...' : '✅ Ativar'}
                    </button>
                  )}
                  {t.plano !== 'pendente' && (
                    <button onClick={() => setPlano(t.id, 'pendente')} disabled={salvando === t.id} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                      {salvando === t.id ? '...' : '⏳ Pendente'}
                    </button>
                  )}
                  {t.plano !== 'inativo' && (
                    <button onClick={() => setPlano(t.id, 'inativo')} disabled={salvando === t.id} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'rgba(229,57,53,0.15)', color: 'var(--red)' }}>
                      {salvando === t.id ? '...' : '🔒 Desativar'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}