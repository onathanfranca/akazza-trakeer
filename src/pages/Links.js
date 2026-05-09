// src/pages/Links.js
import React from 'react';
import { useToast } from '../context/ToastContext';

export default function Links({ casas }) {
  const { showToast } = useToast();

  const casasComLink = casas.filter(c => c.link);

  return (
    <div className="fade-in">
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius)',
        padding: '16px 18px',
        marginBottom: 14,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, color: 'var(--accent)', marginBottom: 4, textShadow: '0 0 10px rgba(201,168,76,0.35)' }}>
          🔗 LINKS DE DIVULGAÇÃO
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Use esses links para captar novos jogadores. Cada cadastro feito pelo seu link conta como um CPA.
        </div>
      </div>

      {casasComLink.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🔗</div>
          Nenhum link cadastrado ainda. O admin pode adicionar links na aba Afiliados.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {casasComLink.map(casa => (
            <div key={casa.id} style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius)',
              padding: '16px 18px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color .2s, box-shadow .2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)' }} />

              {/* Nome da casa */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>🏠</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{casa.nome}</span>
              </div>

              {/* URL */}
              <div style={{
                background: 'rgba(6,6,12,0.5)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                  {casa.link}
                </span>
              </div>

              {/* Botões */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(casa.link);
                    showToast('✅ Link copiado!', 'green');
                  }}
                  style={{
                    flex: 1,
                    background: 'var(--glass-bg)',
                    backdropFilter: 'var(--glass-blur)',
                    border: '1.5px solid var(--glass-border)',
                    borderRadius: 9,
                    padding: '11px',
                    fontSize: 13,
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontFamily: 'var(--font-body)',
                    transition: 'all .15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text)'; }}
                >
                  📋 Copiar link
                </button>
                <a
                  href={casa.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, var(--accent2), var(--accent))',
                    borderRadius: 9,
                    padding: '11px',
                    fontSize: 13,
                    color: '#000',
                    fontWeight: 700,
                    textDecoration: 'none',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: '0 0 12px rgba(201,168,76,0.25)',
                    transition: 'box-shadow .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(201,168,76,0.45)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 12px rgba(201,168,76,0.25)'}
                >
                  Abrir →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
