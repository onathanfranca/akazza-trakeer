// src/components/CPAChart.js
// Gráfico de linha — faturamento por dia
// Tooltip ao arrastar/tocar | SVG puro, sem dependências externas

import React, { useMemo, useRef, useState, useCallback } from 'react';
import { format, eachDayOfInterval, parseISO } from 'date-fns';

export default function CPAChart({ cpas, dateFrom, dateTo, casas, userRole }) {
  const svgRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const data = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    try {
      const days = eachDayOfInterval({ start: parseISO(dateFrom), end: parseISO(dateTo) });
      const map = {};
      days.forEach(d => { map[format(d, 'yyyy-MM-dd')] = 0; });

      cpas.forEach(cpa => {
        if (cpa.status === 'pendente' || cpa.status === 'rejeitado') return;
        const ts = cpa.createdAt;
        if (!ts) return;
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const key = format(d, 'yyyy-MM-dd');
        if (map[key] === undefined) return;

        let valor = 0;
        if (cpa.valorCPA != null) {
          valor = Number(cpa.valorCPA);
        } else if (casas) {
          const casa = casas.find(c => c.nome === cpa.casa);
          if (casa) {
            valor = userRole === 'admin'
              ? (casa.valorAdmin ?? casa.valor ?? 0)
              : (casa.valorAfiliado ?? casa.valor ?? 0);
          }
        }
        map[key] += valor;
      });

      return days.map(d => ({
        label: format(d, 'dd/MM'),
        key: format(d, 'yyyy-MM-dd'),
        value: map[format(d, 'yyyy-MM-dd')],
      }));
    } catch {
      return [];
    }
  }, [cpas, dateFrom, dateTo, casas, userRole]);

  if (data.length === 0) return null;

  // Dimensões maiores — melhor no mobile
  const W = 600;
  const H = 250;
  const PAD_L = 44;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const xOf = (i) => data.length === 1
    ? PAD_L + innerW / 2
    : PAD_L + (i / (data.length - 1)) * innerW;
  const yOf = (v) => PAD_T + innerH - (v / maxVal) * innerH;

  const points = data.map((d, i) => `${xOf(i)},${yOf(d.value)}`).join(' ');

  const areaPath = data.length === 1
    ? `M ${xOf(0)},${PAD_T + innerH} L ${xOf(0)},${yOf(data[0].value)} L ${xOf(0)},${PAD_T + innerH} Z`
    : [
        `M ${xOf(0)},${PAD_T + innerH}`,
        ...data.map((d, i) => `L ${xOf(i)},${yOf(d.value)}`),
        `L ${xOf(data.length - 1)},${PAD_T + innerH}`,
        'Z',
      ].join(' ');

  const fmtY = (v) => {
    if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
    return `${Math.round(v)}`;
  };

  const fmtMoney = (v) =>
    `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const labelStep = Math.max(1, Math.ceil(data.length / 7));

  const resolveIdx = useCallback((clientX) => {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return null;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const svgX = (clientX - rect.left) * scaleX;
    const clamped = Math.max(PAD_L, Math.min(W - PAD_R, svgX));
    const ratio = (clamped - PAD_L) / innerW;
    const idx = Math.round(ratio * (data.length - 1));
    return Math.max(0, Math.min(data.length - 1, idx));
  }, [data.length, innerW]);

  function showTooltip(clientX) {
    const idx = resolveIdx(clientX);
    if (idx === null) return;
    setTooltip({ idx, value: data[idx].value, label: data[idx].label });
  }

  function hideTooltip() { setTooltip(null); }

  function onMouseMove(e) { showTooltip(e.clientX); }
  function onMouseLeave() { hideTooltip(); }
  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length > 0) showTooltip(e.touches[0].clientX);
  }
  function onTouchEnd() { hideTooltip(); }

  const tooltipIdx = tooltip?.idx ?? null;
  const tooltipX = tooltipIdx !== null ? xOf(tooltipIdx) : null;
  const tooltipY = tooltipIdx !== null ? yOf(data[tooltipIdx]?.value ?? 0) : null;

  const TOOLTIP_W = 96;
  const TOOLTIP_H = 34;
  let tooltipBoxX = tooltipX !== null ? tooltipX - TOOLTIP_W / 2 : 0;
  if (tooltipBoxX < PAD_L) tooltipBoxX = PAD_L;
  if (tooltipBoxX + TOOLTIP_W > W - PAD_R) tooltipBoxX = W - PAD_R - TOOLTIP_W;
  const tooltipBoxY = tooltipY !== null
    ? (tooltipY - TOOLTIP_H - 12 < PAD_T ? tooltipY + 12 : tooltipY - TOOLTIP_H - 12)
    : 0;

  return (
    <div className="chart-wrap" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', cursor: 'crosshair' }}
        xmlns="http://www.w3.org/2000/svg"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <defs>
          <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0.01" />
          </linearGradient>
          <filter id="chartGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines + labels Y */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = PAD_T + innerH * (1 - pct);
          const v = maxVal * pct;
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              {pct > 0 && (
                <text x={PAD_L - 6} y={y + 4}
                  fill="rgba(107,107,138,0.65)" fontSize="12" textAnchor="end">
                  {fmtY(v)}
                </text>
              )}
            </g>
          );
        })}

        {/* Área preenchida */}
        <path d={areaPath} fill="url(#chartAreaGrad)" />

        {/* Linha principal */}
        {data.length > 1 && (
          <polyline
            points={points}
            fill="none"
            stroke="#C9A84C"
            strokeWidth="3.0"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#chartGlow)"
          />
        )}

        {/* Linha vertical do tooltip */}
        {tooltip && tooltipX !== null && (
          <line
            x1={tooltipX} y1={PAD_T}
            x2={tooltipX} y2={PAD_T + innerH}
            stroke="rgba(201,168,76,0.4)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        )}

        {/* Pontos nos dias */}
        {data.map((d, i) => {
          const isToday = d.key === todayKey;
          const isHovered = tooltip?.idx === i;
          const cx = xOf(i);
          const cy = yOf(d.value);

          if (isHovered) {
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r="12" fill="rgba(201,168,76,0.12)" />
                <circle cx={cx} cy={cy} r="6" fill="#C9A84C"
                  stroke="var(--bg)" strokeWidth="2.5" filter="url(#chartGlow)" />
              </g>
            );
          }
          if (isToday) {
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r="10" fill="rgba(201,168,76,0.12)" className="chart-pulse-dot" />
                <circle cx={cx} cy={cy} r="5" fill="#C9A84C"
                  stroke="var(--bg)" strokeWidth="2" filter="url(#chartGlow)" />
              </g>
            );
          }
          return (
            <circle key={i} cx={cx} cy={cy} r="3" fill="#C9A84C"
              stroke="var(--bg)" strokeWidth="1.5" opacity={d.value > 0 ? 0.75 : 0.2} />
          );
        })}

        {/* Tooltip box */}
        {tooltip && tooltipX !== null && (
          <g>
            <rect
              x={tooltipBoxX} y={tooltipBoxY}
              width={TOOLTIP_W} height={TOOLTIP_H}
              rx="7" ry="7"
              fill="rgba(10,10,20,0.94)"
              stroke="rgba(201,168,76,0.5)"
              strokeWidth="1"
            />
            <text
              x={tooltipBoxX + TOOLTIP_W / 2}
              y={tooltipBoxY + 13}
              fill="rgba(107,107,138,0.9)"
              fontSize="9"
              textAnchor="middle"
              fontFamily="DM Sans, sans-serif"
            >
              {data[tooltip.idx]?.label}
            </text>
            <text
              x={tooltipBoxX + TOOLTIP_W / 2}
              y={tooltipBoxY + 27}
              fill="#C9A84C"
              fontSize="13"
              fontWeight="700"
              textAnchor="middle"
              fontFamily="Bebas Neue, cursive"
              letterSpacing="1"
            >
              {fmtMoney(tooltip.value)}
            </text>
          </g>
        )}

        {/* Labels eixo X */}
        {data.map((d, i) => {
          if (i % labelStep !== 0 && i !== data.length - 1) return null;
          const isToday = d.key === todayKey;
          const isHovered = tooltip?.idx === i;
          return (
            <text key={i} x={xOf(i)} y={H - 6}
              fill={isHovered || isToday ? '#C9A84C' : 'rgba(107,107,138,0.65)'}
              fontSize="9" textAnchor="middle" fontWeight={isHovered || isToday ? '700' : '400'}>
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
