// src/pages/Links.js
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Links({ casas }) {
  const { showToast } = useToast();
  const { tenantId, isAdmin } = useAuth();

  const casasComLink = casas.filter(c => c.link);
  const linkConvite = `https://akazzatracker.vercel.app/cadastro?tenant=${tenantId}`;

  function copiarLink(link) {
    navigator.clipboard.writeText(link);
    showToast('✅ Link copiado!', 'green');
  }

  return (
    <div className="fade-in">
      <div style={{
        background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)',
        padding: '16px 18px', marginBottom: 14, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, color: 'var(--accent)', marginBottom: 4, textShadow: '0 0 10px rgba(201,168,76,0.35)' }}>
          🔗 LINKS
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Use os links de divulgação para captar novos jogadores. Cada cadastro pelo seu link conta como um CPA.
        </div>
      </div>

      {/* Link de convite de afiliado — só admin vê */}
      {isAdmin && (
        <div style={{
          background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
          border: '1px solid rgba(201,168,76,0.3)', borderRadius: 'var(--radius)',
          padding: '16px 18px', marginBottom: 12, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)' }} />
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>👥 Convidar Afiliado</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Compartilhe esse link com seus afiliados para que eles criem a conta no seu painel.
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {linkConvite}
            </div>
            <button onClick={() => copiarLink(linkConvite)} style={{ padding: '10px 18px', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#000', cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
              📋 Copiar
            </button>
          </div>
        </div>
      )}

      {/* Links de divulgação das casas */}
      {casasComLink.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🔗</div>
          Nenhum link de divulgação cadastrado ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {casasComLink.map(casa => (
            <div key={casa.id} style={{
              background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--glass-border)', borderRadius: 'var(--radius)',
              padding: '16px 18px', position: 'relative', overflow: 'hidden', transition: 'border-color .2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>🏠</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{casa.nome}</span>
              </div>
              <div style={{ background: 'rgba(6,6,12,0.5)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {casa.link}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => copiarLink(casa.link)} style={{ flex: 1, background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', border: '1.5px solid var(--glass-border)', borderRadius: 9, padding: '11px', fontSize: 13, color: 'var(--text)', cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--font-body)', transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text)'; }}>
                  📋 Copiar link
                </button>
                <a href={casa.link} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: 'linear-gradient(135deg, var(--accent2), var(--accent))', borderRadius: 9, padding: '11px', fontSize: 13, color: '#000', fontWeight: 700, textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 0 12px rgba(201,168,76,0.25)', transition: 'box-shadow .15s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(201,168,76,0.45)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 12px rgba(201,168,76,0.25)'}>
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