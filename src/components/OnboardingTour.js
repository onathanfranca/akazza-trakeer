// src/components/OnboardingTour.js
//
// Tour guiado por tooltips para novos admins.
// Salva progresso no localStorage ('akazza_onboarding_done').
// Some quando o usuário completa ou clica em Pular/Encerrar.
//
// USO no App.js (dentro do AppInner, após o <main>):
//   import OnboardingTour from './components/OnboardingTour';
//   <OnboardingTour isAdmin={isAdmin} goTab={goTab} />

import React, { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'akazza_onboarding_done';

// ─── Passos do tour ─────────────────────────────────────────────────────────
// targetId  → id do elemento HTML que o tooltip aponta
// tab       → aba que deve estar aberta (null = não muda)
// abrirDrawer → true se precisa abrir o menu lateral pra ver o elemento
// apontaPara → 'bottom' | 'top' | 'left' | 'right'

const PASSOS = [
  {
    id: 'welcome',
    targetId: null,
    tab: null,
    abrirDrawer: false,
    titulo: '👋 Bem-vindo ao Akazza!',
    descricao: 'Vamos te mostrar em menos de 2 minutos tudo que você precisa saber pra começar a usar. Pode pular quando quiser.',
    apontaPara: null,
    acaoBotao: 'Começar tour',
  },
  {
    id: 'menu',
    targetId: 'onb-menu-toggle',  // botão hamburguer do header — sempre visível
    tab: null,
    abrirDrawer: false,           // NÃO abre o drawer, só aponta pro botão
    titulo: '☰ Menu de navegação',
    descricao: 'Toque aqui pra abrir o menu e acessar todas as seções: Painel Geral, Aprovações, Config e mais.',
    apontaPara: 'bottom',
    acaoBotao: 'Próximo',
  },
  {
    id: 'painel_admin',
    targetId: 'onb-painel-admin', // item do drawer
    tab: 'admin',
    abrirDrawer: true,
    titulo: '📊 Painel Geral',
    descricao: 'Aqui você vê o resumo de todos os afiliados: total de CPAs, faturamento, custo e lucro do período.',
    apontaPara: 'right',
    acaoBotao: 'Próximo',
  },
  {
    id: 'config_casa',
    targetId: 'onb-config',       // item do drawer
    tab: 'config',
    abrirDrawer: true,
    titulo: '⚙️ Configure suas casas',
    descricao: 'Antes de tudo, cadastre as casas de apostas com os valores de CPA que você paga para cada afiliado.',
    apontaPara: 'right',
    acaoBotao: 'Próximo',
  },
  {
    id: 'pushcut',
    targetId: 'onb-pushcut',      // seção dentro da aba Config
    tab: 'config',
    abrirDrawer: false,
    titulo: '🔔 Notificações Pushcut',
    descricao: 'Se você usa iPhone, configure aqui o Pushcut pra receber uma notificação toda vez que um CPA for registrado ou aprovado.',
    apontaPara: 'top',
    acaoBotao: 'Próximo',
  },
  {
    id: 'links',
    targetId: 'onb-links',        // item do drawer
    tab: 'links',
    abrirDrawer: true,
    titulo: '🔗 Convide seus afiliados',
    descricao: 'Copie o link de convite aqui e mande pro seu time. Cada afiliado cria a própria conta e já aparece no seu painel.',
    apontaPara: 'right',
    acaoBotao: 'Próximo',
  },
  {
    id: 'aprovacoes',
    targetId: 'onb-aprovacoes',   // item do drawer
    tab: 'aprovacoes',
    abrirDrawer: true,
    titulo: '✅ Aprove os CPAs',
    descricao: 'Quando um afiliado registrar um CPA, ele aparece aqui. Você aprova com comprovante ou rejeita com motivo.',
    apontaPara: 'right',
    acaoBotao: 'Próximo',
  },
  {
    id: 'fechamento',
    targetId: 'onb-fechamento',   // item do drawer
    tab: 'fechamento',
    abrirDrawer: true,
    titulo: '💰 Fechamentos',
    descricao: 'No final do período, gere o fechamento por afiliado, exporte o CSV e tenha tudo documentado pra pagar certinho.',
    apontaPara: 'right',
    acaoBotao: 'Concluir tour ✓',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRect(id) {
  if (!id) return null;
  const el = document.getElementById(id);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(val, max));
}

// Retorna dimensões do viewport considerando teclado virtual e barra do Safari
function getViewport() {
  const vv = window.visualViewport;
  if (vv) {
    return {
      vw: vv.width,
      vh: vv.height,
      offsetTop: vv.offsetTop,
      offsetLeft: vv.offsetLeft,
    };
  }
  return { vw: window.innerWidth, vh: window.innerHeight, offsetTop: 0, offsetLeft: 0 };
}

function calcTooltipPos(rect, apontaPara, tW, tH) {
  const gap = 12;
  const margin = 12;
  const { vw, vh, offsetTop, offsetLeft } = getViewport();

  // Converte rect para coordenadas relativas ao visualViewport
  const r = {
    top:    rect.top    - offsetTop,
    bottom: rect.bottom - offsetTop,
    left:   rect.left   - offsetLeft,
    right:  rect.right  - offsetLeft,
    width:  rect.width,
    height: rect.height,
  };

  let dir = apontaPara;

  // Em mobile (<480px), passos com 'right' provavelmente não cabem à direita do drawer
  // Verificar se cabe; se não, usar 'bottom'
  if (dir === 'right' && r.right + gap + tW + margin > vw) {
    dir = 'bottom';
  }
  if (dir === 'left' && r.left - gap - tW - margin < 0) {
    dir = 'bottom';
  }
  // Se 'top' não cabe acima, vira 'bottom'
  if (dir === 'top' && r.top - tH - gap < margin) {
    dir = 'bottom';
  }

  let top, left;

  if (dir === 'bottom') {
    top  = r.bottom + gap;
    left = r.left + r.width / 2 - tW / 2;
  } else if (dir === 'top') {
    top  = r.top - tH - gap;
    left = r.left + r.width / 2 - tW / 2;
  } else if (dir === 'right') {
    top  = r.top + r.height / 2 - tH / 2;
    left = r.right + gap;
  } else if (dir === 'left') {
    top  = r.top + r.height / 2 - tH / 2;
    left = r.left - tW - gap;
  }

  // Garante que nunca ultrapasse as bordas do viewport
  left = clamp(left, margin, vw - tW - margin);
  top  = clamp(top,  margin, vh - tH - margin);

  // Ajusta de volta para coordenadas fixas (adiciona offset do visualViewport)
  return { top: top + offsetTop, left: left + offsetLeft };
}

// Gera o clip-path do overlay com buraco retangular no elemento destacado
// O buraco é definido por um polígono que "corta" o retângulo central
function gerarClipPath(rect) {
  if (!rect) return null;
  const pad = 6;
  const vv = window.visualViewport;
  const W = vv ? vv.width  : window.innerWidth;
  const H = vv ? vv.height : window.innerHeight;
  const offTop  = vv ? vv.offsetTop  : 0;
  const offLeft = vv ? vv.offsetLeft : 0;
  const t = Math.max(0, rect.top    - offTop  - pad);
  const r = Math.min(W, rect.right  - offLeft + pad);
  const b = Math.min(H, rect.bottom - offTop  + pad);
  const l = Math.max(0, rect.left   - offLeft - pad);

  // Polígono: tela inteira com buraco retangular
  return `polygon(
    0px 0px,
    ${W}px 0px,
    ${W}px ${H}px,
    0px ${H}px,
    0px 0px,
    ${l}px ${t}px,
    ${l}px ${b}px,
    ${r}px ${b}px,
    ${r}px ${t}px,
    ${l}px ${t}px
  )`;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export default function OnboardingTour({ isAdmin, goTab, setDrawerOpen }) {
  const [ativo,      setAtivo]      = useState(false);
  const [passo,      setPasso]      = useState(0);
  const [tooltipPos, setTooltipPos] = useState(null);
  const [clipPath,   setClipPath]   = useState(null);
  const [targetRect, setTargetRect] = useState(null);

  const tooltipRef = useRef(null);
  const rafRef     = useRef(null);

  // Inicia só pra admins, só uma vez
  useEffect(() => {
    if (!isAdmin) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setAtivo(true), 900);
    return () => clearTimeout(t);
  }, [isAdmin]);

  const passoAtual = PASSOS[passo];

  // Ao mudar de passo: navega pra aba e controla drawer
  useEffect(() => {
    if (!ativo || !passoAtual) return;

    // Fecha o drawer antes de tudo
    if (setDrawerOpen) setDrawerOpen(false);

    // Navega pra aba correta
    if (passoAtual.tab) goTab(passoAtual.tab);

    // Se o passo precisa do drawer aberto, abre após um delay (pra aba carregar)
    if (passoAtual.abrirDrawer && setDrawerOpen) {
      const t = setTimeout(() => setDrawerOpen(true), 200);
      return () => clearTimeout(t);
    }
  }, [passo, ativo]);

  // Recalcula posição do tooltip e clip-path
  const recalc = useCallback(() => {
    if (!ativo || !passoAtual) return;

    const tEl = tooltipRef.current;
    const vv  = window.visualViewport;
    const vw  = vv ? vv.width : window.innerWidth;
    const tW  = tEl ? tEl.offsetWidth  : Math.min(296, vw - 24);
    const tH  = tEl ? tEl.offsetHeight : 170;

    if (!passoAtual.targetId) {
      // Modal central — sem highlight
      setTooltipPos({ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' });
      setClipPath(null);
      setTargetRect(null);
      return;
    }

    const rect = getRect(passoAtual.targetId);
    if (!rect) {
      setTooltipPos({ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' });
      setClipPath(null);
      setTargetRect(null);
      return;
    }

    setTargetRect(rect);
    setClipPath(gerarClipPath(rect));

    const { top, left } = calcTooltipPos(rect, passoAtual.apontaPara, tW, tH);
    setTooltipPos({ top, left });
  }, [ativo, passoAtual]);

  // Recalcula ao mudar de passo e em resize
  useEffect(() => {
    if (!ativo) return;
    const t = setTimeout(recalc, 350); // delay maior pra drawer/aba renderizar no iOS

    function onResize() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(recalc);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    // visualViewport para iOS Safari (teclado virtual, barra de URL)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onResize);
      window.visualViewport.addEventListener('scroll', onResize);
    }

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', onResize);
        window.visualViewport.removeEventListener('scroll', onResize);
      }
    };
  }, [ativo, passo, recalc]);

  function encerrar() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setAtivo(false);
    setClipPath(null);
    // Fecha o drawer se estiver aberto
    if (setDrawerOpen) setDrawerOpen(false);
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

  const isCentral = !passoAtual.targetId;
  const isFirst   = passo === 0;
  const isLast    = passo === PASSOS.length - 1;

  // ── Seta direcional ────────────────────────────────────────────────────────
  function Seta() {
    const dir = passoAtual.apontaPara;
    if (!dir || !targetRect) return null;

    const sz = 9; // metade do tamanho da seta
    const base = {
      position: 'absolute',
      width: 0,
      height: 0,
      border: `${sz}px solid transparent`,
    };

    if (dir === 'bottom') return <div style={{ ...base, top: -sz * 2, left: '50%', transform: 'translateX(-50%)', borderBottom: `${sz}px solid #1c1c32`, borderTop: 'none' }} />;
    if (dir === 'top')    return <div style={{ ...base, bottom: -sz * 2, left: '50%', transform: 'translateX(-50%)', borderTop: `${sz}px solid #1c1c32`, borderBottom: 'none' }} />;
    if (dir === 'right')  return <div style={{ ...base, top: '50%', left: -sz * 2, transform: 'translateY(-50%)', borderRight: `${sz}px solid #1c1c32`, borderLeft: 'none' }} />;
    if (dir === 'left')   return <div style={{ ...base, top: '50%', right: -sz * 2, transform: 'translateY(-50%)', borderLeft: `${sz}px solid #1c1c32`, borderRight: 'none' }} />;
    return null;
  }

  // ── Dots de progresso ──────────────────────────────────────────────────────
  function Dots() {
    return (
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 14 }}>
        {PASSOS.map((_, i) => (
          <div key={i} style={{
            width: i === passo ? 18 : 6,
            height: 6,
            borderRadius: 3,
            background: i === passo
              ? '#C9A84C'
              : i < passo
                ? 'rgba(201,168,76,0.35)'
                : 'rgba(255,255,255,0.1)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* ── Overlay escuro COM BURACO no elemento destacado ── */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 8000,
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.72)',
        // clipPath cria o buraco transparente sobre o elemento destacado
        clipPath: clipPath || undefined,
        transition: 'clip-path 0.25s ease',
      }} />

      {/* ── Borda dourada pulsante ao redor do elemento destacado ── */}
      {targetRect && (
        <div style={{
          position: 'fixed',
          top:    targetRect.top    - 6,
          left:   targetRect.left   - 6,
          width:  targetRect.width  + 12,
          height: targetRect.height + 12,
          zIndex: 8001,
          borderRadius: 10,
          border: '2px solid rgba(201,168,76,0.85)',
          pointerEvents: 'none',
          animation: 'onb-pulse-border 1.8s ease-in-out infinite',
        }} />
      )}

      {/* ── Botão Pular (fixo, sempre visível) ── */}
      <button
        onClick={encerrar}
        style={{
          position: 'fixed',
          top: 'max(14px, env(safe-area-inset-top, 14px))',
          right: 'max(14px, env(safe-area-inset-right, 14px))',
          zIndex: 8200,
          background: 'rgba(20,20,36,0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          color: 'rgba(255,255,255,0.45)',
          fontSize: 12,
          fontWeight: 600,
          padding: '6px 13px',
          cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          letterSpacing: '0.02em',
          pointerEvents: 'all',
        }}
      >
        Pular tour ✕
      </button>

      {/* ── Tooltip ── */}
      {tooltipPos && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            zIndex: 8100,
            width: Math.min(296, (window.visualViewport ? window.visualViewport.width : window.innerWidth) - 24),
            background: '#1c1c32',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 14,
            padding: '18px 18px 14px',
            boxShadow: '0 12px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,168,76,0.08)',
            fontFamily: 'DM Sans, sans-serif',
            pointerEvents: 'all',
            ...(isCentral
              ? { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
              : { top: tooltipPos.top, left: tooltipPos.left }),
            animation: 'onb-fadein 0.2s ease',
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

          <div style={{ fontSize: 15, fontWeight: 700, color: '#f0ede6', marginBottom: 7, lineHeight: 1.35 }}>
            {passoAtual.titulo}
          </div>
          <div style={{ fontSize: 13, color: '#88888a', lineHeight: 1.65, marginBottom: 16 }}>
            {passoAtual.descricao}
          </div>

          {/* Rodapé */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {!isFirst ? (
              <button onClick={voltar} style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: 'rgba(255,255,255,0.4)',
                fontSize: 12,
                fontWeight: 600,
                padding: '7px 13px',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                ← Voltar
              </button>
            ) : <div />}

            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>
              {passo + 1} / {PASSOS.length}
            </span>

            <button
              onClick={avancar}
              style={{
                background: '#C9A84C',
                border: 'none',
                borderRadius: 8,
                color: '#0a0a0a',
                fontSize: 13,
                fontWeight: 700,
                padding: '8px 16px',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
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

      <style>{`
        @keyframes onb-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes onb-pulse-border {
          0%,100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.45); }
          50%      { box-shadow: 0 0 0 5px rgba(201,168,76,0); }
        }
      `}</style>
    </>
  );
}