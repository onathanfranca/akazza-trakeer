// src/components/OnboardingTour.js
//
// Tour guiado por tooltips para novos admins.
// Salva progresso no localStorage ('akazza_onboarding_done').
// Some quando o usuário completa ou clica em Pular/Encerrar.
//
// USO no App.js (dentro do AppInner):
//   import OnboardingTour from './components/OnboardingTour';
//   <OnboardingTour isAdmin={isAdmin} goTab={goTab} />

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Passos do tour ────────────────────────────────────────────────────────────
// targetId: id do elemento HTML que o tooltip vai apontar
// tab: aba que precisa estar aberta pra esse passo aparecer (null = qualquer)
// apontaPara: 'bottom' | 'top' | 'left' | 'right' (de onde sai a seta)

const PASSOS = [
  {
    id: 'welcome',
    targetId: null, // modal central, sem alvo
    tab: null,
    titulo: '👋 Bem-vindo ao Akazza!',
    descricao: 'Vamos te mostrar em menos de 2 minutos tudo que você precisa saber pra começar a usar. Pode pular quando quiser.',
    apontaPara: null,
    acaoBotao: 'Começar tour',
    completaAuto: false,
  },
  {
    id: 'menu',
    targetId: 'onb-menu-toggle',
    tab: null,
    titulo: '☰ Menu de navegação',
    descricao: 'Toque aqui pra acessar todas as seções: Painel Geral, Aprovações, Ranking, Config e mais.',
    apontaPara: 'bottom',
    acaoBotao: 'Próximo',
    completaAuto: false,
  },
  {
    id: 'painel_admin',
    targetId: 'onb-painel-admin',
    tab: 'admin',
    titulo: '📊 Painel Geral',
    descricao: 'Aqui você vê o resumo de todos os afiliados: total de CPAs, faturamento, custo e lucro do período.',
    apontaPara: 'bottom',
    acaoBotao: 'Próximo',
    completaAuto: false,
  },
  {
    id: 'config_casa',
    targetId: 'onb-config',
    tab: 'config',
    titulo: '⚙️ Configure suas casas',
    descricao: 'Antes de tudo, cadastre as casas de apostas com os valores de CPA que você paga para cada afiliado.',
    apontaPara: 'bottom',
    acaoBotao: 'Próximo',
    completaAuto: false,
  },
  {
    id: 'links',
    targetId: 'onb-links',
    tab: 'links',
    titulo: '🔗 Convide seus afiliados',
    descricao: 'Copie o link de convite aqui e mande pro seu time. Cada afiliado cria a própria conta e já aparece no seu painel.',
    apontaPara: 'bottom',
    acaoBotao: 'Próximo',
    completaAuto: false,
  },
  {
    id: 'aprovacoes',
    targetId: 'onb-aprovacoes',
    tab: 'aprovacoes',
    titulo: '✅ Aprove os CPAs',
    descricao: 'Quando um afiliado registrar um CPA, ele aparece aqui. Você aprova com comprovante ou rejeita com motivo.',
    apontaPara: 'bottom',
    acaoBotao: 'Próximo',
    completaAuto: false,
  },
  {
    id: 'fechamento',
    targetId: 'onb-fechamento',
    tab: 'fechamento',
    titulo: '💰 Fechamentos',
    descricao: 'No final do período, gere o fechamento por afiliado, exporte o CSV e tenha tudo documentado pra pagar certinho.',
    apontaPara: 'bottom',
    acaoBotao: 'Próximo',
    completaAuto: false,
  },
  {
    id: 'perfil',
    targetId: 'onb-perfil',
    tab: 'perfil',
    titulo: '👤 Configure seu perfil',
    descricao: 'Adicione sua foto e, se usar iPhone, configure o Pushcut pra receber notificação a cada CPA novo.',
    apontaPara: 'bottom',
    acaoBotao: 'Concluir tour ✓',
    completaAuto: false,
  },
];

const STORAGE_KEY = 'akazza_onboarding_done';

// ─── Utilitários ───────────────────────────────────────────────────────────────

function getElementRect(id) {
  if (!id) return null;
  const el = document.getElementById(id);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function calcTooltipPos(rect, apontaPara, tooltipW, tooltipH) {
  if (!rect || !apontaPara) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };

  const margin = 14;
  const arrowSize = 10;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top, left;

  if (apontaPara === 'bottom') {
    top = rect.bottom + margin + arrowSize;
    left = rect.left + rect.width / 2 - tooltipW / 2;
  } else if (apontaPara === 'top') {
    top = rect.top - tooltipH - margin - arrowSize;
    left = rect.left + rect.width / 2 - tooltipW / 2;
  } else if (apontaPara === 'right') {
    top = rect.top + rect.height / 2 - tooltipH / 2;
    left = rect.right + margin + arrowSize;
  } else if (apontaPara === 'left') {
    top = rect.top + rect.height / 2 - tooltipH / 2;
    left = rect.left - tooltipW - margin - arrowSize;
  }

  // Clamp pra não sair da tela
  left = Math.max(12, Math.min(left, vw - tooltipW - 12));
  top = Math.max(12, Math.min(top, vh - tooltipH - 12));

  return { top, left };
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function OnboardingTour({ isAdmin, goTab }) {
  const [ativo, setAtivo] = useState(false);
  const [passo, setPasso] = useState(0);
  const [pos, setPos] = useState(null);
  const [highlight, setHighlight] = useState(null); // { top, left, width, height }
  const tooltipRef = useRef(null);
  const rafRef = useRef(null);

  // Inicia só pra admins, só uma vez
  useEffect(() => {
    if (!isAdmin) return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Pequeno delay pra garantir que o layout montou
      const t = setTimeout(() => setAtivo(true), 800);
      return () => clearTimeout(t);
    }
  }, [isAdmin]);

  const passoAtual = PASSOS[passo];

  // Navega pra aba correta quando o passo muda
  useEffect(() => {
    if (!ativo || !passoAtual?.tab) return;
    goTab(passoAtual.tab);
  }, [passo, ativo]);

  // Atualiza posição do tooltip e highlight
  const atualizarPos = useCallback(() => {
    if (!ativo || !passoAtual) return;

    const tooltipEl = tooltipRef.current;
    const tooltipW = tooltipEl ? tooltipEl.offsetWidth : 300;
    const tooltipH = tooltipEl ? tooltipEl.offsetHeight : 160;

    if (!passoAtual.targetId) {
      // Modal central
      setPos({ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' });
      setHighlight(null);
      return;
    }

    const rect = getElementRect(passoAtual.targetId);
    if (!rect) {
      // Elemento não encontrado — centraliza
      setPos({ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' });
      setHighlight(null);
      return;
    }

    const { top, left } = calcTooltipPos(rect, passoAtual.apontaPara, tooltipW, tooltipH);
    setPos({ top, left });

    // Highlight do elemento alvo
    setHighlight({
      top: rect.top - 4,
      left: rect.left - 4,
      width: rect.width + 8,
      height: rect.height + 8,
    });
  }, [ativo, passoAtual]);

  // Recalcula posição em resize/scroll e quando passo muda
  useEffect(() => {
    if (!ativo) return;

    // Delay pra aba renderizar antes de calcular
    const t = setTimeout(atualizarPos, 120);

    function onResizeScroll() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(atualizarPos);
    }

    window.addEventListener('resize', onResizeScroll);
    window.addEventListener('scroll', onResizeScroll, true);

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResizeScroll);
      window.removeEventListener('scroll', onResizeScroll, true);
    };
  }, [ativo, passo, atualizarPos]);

  function encerrar() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setAtivo(false);
    setHighlight(null);
  }

  function avancar() {
    if (passo >= PASSOS.length - 1) {
      encerrar();
    } else {
      setPasso(p => p + 1);
    }
  }

  function voltar() {
    if (passo > 0) setPasso(p => p - 1);
  }

  if (!ativo) return null;

  const isFirst = passo === 0;
  const isLast = passo === PASSOS.length - 1;
  const isCentral = !passoAtual.targetId;

  // ─── Seta direcional ────────────────────────────────────────────────────────
  function Seta() {
    if (!passoAtual.apontaPara || !highlight) return null;
    const dir = passoAtual.apontaPara;
    const size = 10;
    const style = {
      position: 'absolute',
      width: 0, height: 0,
      border: `${size}px solid transparent`,
    };
    if (dir === 'bottom') {
      Object.assign(style, {
        top: -size * 2,
        left: '50%',
        transform: 'translateX(-50%)',
        borderBottomColor: '#1a1a2e',
        borderTop: 'none',
      });
    } else if (dir === 'top') {
      Object.assign(style, {
        bottom: -size * 2,
        left: '50%',
        transform: 'translateX(-50%)',
        borderTopColor: '#1a1a2e',
        borderBottom: 'none',
      });
    } else if (dir === 'right') {
      Object.assign(style, {
        top: '50%',
        left: -size * 2,
        transform: 'translateY(-50%)',
        borderRightColor: '#1a1a2e',
        borderLeft: 'none',
      });
    } else if (dir === 'left') {
      Object.assign(style, {
        top: '50%',
        right: -size * 2,
        transform: 'translateY(-50%)',
        borderLeftColor: '#1a1a2e',
        borderRight: 'none',
      });
    }
    return <div style={style} />;
  }

  // ─── Dots de progresso ──────────────────────────────────────────────────────
  function Dots() {
    return (
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 14 }}>
        {PASSOS.map((_, i) => (
          <div key={i} style={{
            width: i === passo ? 16 : 6,
            height: 6,
            borderRadius: 3,
            background: i === passo ? '#C9A84C' : i < passo ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.12)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* ── Overlay escuro ── */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 8000,
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(1px)',
        WebkitBackdropFilter: 'blur(1px)',
      }} />

      {/* ── Highlight do elemento alvo (buraco no overlay) ── */}
      {highlight && (
        <div style={{
          position: 'fixed',
          top: highlight.top,
          left: highlight.left,
          width: highlight.width,
          height: highlight.height,
          zIndex: 8001,
          borderRadius: 10,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
          border: '2px solid rgba(201,168,76,0.7)',
          pointerEvents: 'none',
          animation: 'onb-pulse 2s ease-in-out infinite',
        }} />
      )}

      {/* ── Botão Encerrar (canto superior direito) ── */}
      <button
        onClick={encerrar}
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 8100,
          background: 'rgba(18,18,30,0.9)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          color: 'rgba(255,255,255,0.5)',
          fontSize: 12,
          fontWeight: 600,
          padding: '6px 12px',
          cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          letterSpacing: '0.03em',
        }}
      >
        Pular tour ✕
      </button>

      {/* ── Tooltip / Modal ── */}
      {pos && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            zIndex: 8100,
            width: Math.min(300, window.innerWidth - 24),
            background: '#1a1a2e',
            border: '1px solid rgba(201,168,76,0.35)',
            borderRadius: 14,
            padding: '18px 18px 14px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,168,76,0.1)',
            fontFamily: 'DM Sans, sans-serif',
            // Posição calculada (ou central)
            ...(isCentral
              ? { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
              : { top: pos.top, left: pos.left }),
            animation: 'onb-fadein 0.22s ease',
          }}
        >
          {/* Linha dourada no topo */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
            borderRadius: '14px 14px 0 0',
          }} />

          <Seta />

          <Dots />

          {/* Conteúdo */}
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#f0ede6',
            marginBottom: 6,
            lineHeight: 1.35,
          }}>
            {passoAtual.titulo}
          </div>
          <div style={{
            fontSize: 13,
            color: '#888880',
            lineHeight: 1.65,
            marginBottom: 16,
          }}>
            {passoAtual.descricao}
          </div>

          {/* Rodapé: voltar + passo/total + avançar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {!isFirst ? (
              <button onClick={voltar} style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                color: 'rgba(255,255,255,0.45)',
                fontSize: 12,
                fontWeight: 600,
                padding: '7px 13px',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'all 0.15s',
              }}>
                ← Voltar
              </button>
            ) : <div />}

            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>
              {passo + 1} / {PASSOS.length}
            </span>

            <button onClick={avancar} style={{
              background: '#C9A84C',
              border: 'none',
              borderRadius: 8,
              color: '#0a0a0a',
              fontSize: 13,
              fontWeight: 700,
              padding: '8px 16px',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              transition: 'background 0.15s',
              letterSpacing: '0.02em',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#A67C32'}
              onMouseLeave={e => e.currentTarget.style.background = '#C9A84C'}
            >
              {passoAtual.acaoBotao}
            </button>
          </div>
        </div>
      )}

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes onb-fadein {
          from { opacity: 0; transform: ${isCentral ? 'translate(-50%,-46%)' : 'translateY(6px)'}; }
          to   { opacity: 1; transform: ${isCentral ? 'translate(-50%,-50%)' : 'translateY(0)'}; }
        }
        @keyframes onb-pulse {
          0%, 100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.55), 0 0 0 0 rgba(201,168,76,0.4); }
          50%       { box-shadow: 0 0 0 9999px rgba(0,0,0,0.55), 0 0 0 6px rgba(201,168,76,0); }
        }
      `}</style>
    </>
  );
}
