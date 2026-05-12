// src/components/TrialBanner.js
import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function TrialBanner() {
  const { emTrial, diasRestantesTrial, userProfile } = useAuth();

  // Só exibe para admin em período de trial
  if (!emTrial || userProfile?.role !== 'admin') return null;

  const urgente = diasRestantesTrial <= 2;
  const cor = urgente ? '#e74c3c' : '#C9A84C';
  const bgColor = urgente ? 'rgba(231,76,60,0.1)' : 'rgba(201,168,76,0.1)';
  const borderColor = urgente ? 'rgba(231,76,60,0.35)' : 'rgba(201,168,76,0.35)';
  const emoji = urgente ? '⚠️' : '🎁';

  let texto;
  if (diasRestantesTrial <= 0) {
    texto = 'Último dia de teste grátis!';
  } else if (diasRestantesTrial === 1) {
    texto = 'Amanhã seu teste grátis acaba!';
  } else {
    texto = `${diasRestantesTrial} dias restantes no teste grátis`;
  }

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 10,
      padding: '10px 16px',
      margin: '10px 16px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      fontSize: 14,
      color: cor,
      fontFamily: 'DM Sans, sans-serif',
      fontWeight: 600,
      flexWrap: 'wrap',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {emoji} {texto}
      </span>
      <a
        href="https://pay.lowify.com.br/checkout.php?product_id=WsYxbQ"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: cor,
          color: urgente ? '#fff' : '#1a1a1a',
          padding: '6px 16px',
          borderRadius: 7,
          fontSize: 13,
          fontWeight: 700,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          fontFamily: 'DM Sans, sans-serif',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        Assinar agora
      </a>
    </div>
  );
}
