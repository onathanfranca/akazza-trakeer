// src/pages/MeusFechamentos.js — Afiliado: histórico de fechamentos
import React from 'react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useFechamentos } from '../hooks/useAdmin';

function fmtVal(n) { return `R$ ${Number(Math.abs(n || 0)).toLocaleString('pt-BR')}`; }
function fmtDate(str) {
  if (!str) return '--';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}
function fmtTs(ts) {
  if (!ts) return '--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'dd/MM/yyyy');
}

export default function MeusFechamentos() {
  const { currentUser } = useAuth();
  const { fechamentos, loading } = useFechamentos(currentUser?.uid);

  const total = fechamentos.reduce((acc, f) => acc + Number(f.valorPago || 0), 0);

  return (
    <div className="fade-in">
      {/* Resumo geral */}
      {fechamentos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
          <div className="resumo-card">
            <div className="resumo-label">Fechamentos</div>
            <div className="resumo-val white">{fechamentos.length}</div>
          </div>
          <div className="resumo-card">
            <div className="resumo-label">CPAs totais</div>
            <div className="resumo-val" style={{ color: 'var(--accent)' }}>
              {fechamentos.reduce((acc, f) => acc + Number(f.totalCPAs || 0), 0)}
            </div>
          </div>
          <div className="resumo-card">
            <div className="resumo-label">Total recebido</div>
            <div className="resumo-val green">{fmtVal(total)}</div>
          </div>
        </div>
      )}

      <div className="section-title">💰 Meus Fechamentos</div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /><span className="loading-text">Carregando...</span></div>
      ) : fechamentos.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          Nenhum fechamento registrado ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fechamentos.map(f => (
            <div key={f.id} style={{
              background: 'var(--card)', borderRadius: 14, padding: '16px 18px',
              border: '1px solid var(--border)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {fmtDate(f.dateFrom)} → {fmtDate(f.dateTo)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Pago em {fmtTs(f.criadoEm)}
                  </div>
                  {f.observacao && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      📝 {f.observacao}
                    </div>
                  )}
                </div>
                <span style={{ background: 'var(--green)', color: '#000', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99 }}>
                  ✅ PAGO
                </span>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>CPAs</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)' }}>{f.totalCPAs}</div>
                </div>
                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Faturamento</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--accent)' }}>{fmtVal(f.faturamento)}</div>
                </div>
                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Recebido</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--green)' }}>{fmtVal(f.valorPago)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
