// src/pages/Historico.js
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useLogs } from '../hooks/useAdmin';
import { useAuth } from '../context/AuthContext';

function fmtTs(ts) {
  if (!ts) return '--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'dd/MM/yyyy HH:mm');
}

const ACOES = {
  cpa_registrado:    { icon: '📝', label: 'Registrou CPA',       color: 'var(--accent)' },
  cpa_aprovado:      { icon: '✅', label: 'Aprovou CPA',         color: 'var(--green)'  },
  cpa_rejeitado:     { icon: '❌', label: 'Rejeitou CPA',        color: 'var(--red)'    },
  fechamento_criado: { icon: '💰', label: 'Criou fechamento',    color: '#4ea'          },
  afiliado_aprovado: { icon: '👤', label: 'Aprovou afiliado',    color: 'var(--green)'  },
  afiliado_recusado: { icon: '🚫', label: 'Recusou afiliado',    color: 'var(--red)'    },
};

export default function Historico() {
  const { tenantId } = useAuth();
  const { logs, loading } = useLogs(tenantId);
  const [filtroAcao, setFiltroAcao] = useState('todos');
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    return logs
      .filter(l => filtroAcao === 'todos' || l.acao === filtroAcao)
      .filter(l => {
        const q = busca.toLowerCase();
        return !q || l.nome?.toLowerCase().includes(q) || l.detalhe?.toLowerCase().includes(q);
      });
  }, [logs, filtroAcao, busca]);

  return (
    <div className="fade-in">
      <div style={{
        background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)',
        padding: '16px 18px', marginBottom: 14, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, color: 'var(--accent)', marginBottom: 4 }}>
          📜 HISTÓRICO DE ATIVIDADES
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Registro de todas as ações realizadas no painel.
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input-field"
          placeholder="🔍 Buscar por nome ou detalhe..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <div className="chips" style={{ margin: 0 }}>
          <div className={`chip${filtroAcao === 'todos' ? ' active' : ''}`} onClick={() => setFiltroAcao('todos')}>Todos</div>
          {Object.entries(ACOES).map(([key, val]) => (
            <div key={key} className={`chip${filtroAcao === key ? ' active' : ''}`} onClick={() => setFiltroAcao(key)}>
              {val.icon} {val.label}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /><span className="loading-text">Carregando...</span></div>
      ) : filtrados.length === 0 ? (
        <div className="empty"><div className="empty-icon">📭</div>Nenhuma atividade encontrada.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
          {/* Linha vertical da timeline */}
          <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: 'var(--border)', zIndex: 0 }} />

          {filtrados.map((log, i) => {
            const acao = ACOES[log.acao] || { icon: '•', label: log.acao, color: 'var(--text-muted)' };
            return (
              <div key={log.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16, position: 'relative', zIndex: 1 }}>
                {/* Ícone */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--card)', border: `2px solid ${acao.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, boxShadow: `0 0 8px ${acao.color}44`,
                }}>
                  {acao.icon}
                </div>

                {/* Conteúdo */}
                <div style={{
                  flex: 1, background: 'var(--card)', borderRadius: 12,
                  padding: '10px 14px', border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{log.nome || 'Sistema'}</span>
                      <span style={{ fontSize: 12, color: acao.color, fontWeight: 600 }}>{acao.label}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtTs(log.criadoEm)}</span>
                  </div>
                  {log.detalhe && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{log.detalhe}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
