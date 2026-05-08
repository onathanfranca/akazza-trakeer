// src/components/CPAChart.js
// Gráfico de linha com área preenchida e ponto pulsante no dia atual
// Não usa nenhuma lib externa — SVG puro

import React, { useMemo } from 'react';
import { format, eachDayOfInterval, parseISO } from 'date-fns';

export default function CPAChart({ cpas, dateFrom, dateTo, label = 'CPAs por dia' }) {
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
        if (map[key] !== undefined) map[key]++;
      });
      return days.map(d => ({
        label: format(d, 'dd/MM'),
        key: format(d, 'yyyy-MM-dd'),
        value: map[format(d, 'yyyy-MM-dd')],
      }));
    } catch {
      return [];
    }
  }, [cpas, dateFrom, dateTo]);

  if (data.length < 2) return null;

  const W = 600;
  const H = 120;
  const PAD_L = 32;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const xOf = (i) => PAD_L + (i / (data.length - 1)) * innerW;
  const yOf = (v) => PAD_T + innerH - (v / maxVal) * innerH;

  // polyline points
  const points = data.map((d, i) => `${xOf(i)},${yOf(d.value)}`).join(' ');

  // area path
  const areaPath = [
    `M ${xOf(0)},${yOf(0)}`,
    ...data.map((d, i) => `L ${xOf(i)},${yOf(d.value)}`),
    `L ${xOf(data.length - 1)},${yOf(0)}`,
    'Z',
  ].join(' ');

  const todayIdx = data.findIndex(d => d.key === todayKey);

  // Quais labels mostrar (max ~7)
  const labelStep = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div className="chart-wrap">
      <div className="chart-title">{label}</div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0.01" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = PAD_T + innerH * (1 - pct);
          const v = Math.round(maxVal * pct);
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              {pct > 0 && (
                <text x={PAD_L - 4} y={y + 4} fill="rgba(107,107,138,0.7)"
                  fontSize="9" textAnchor="end">{v}</text>
              )}
            </g>
          );
        })}

        {/* Área preenchida */}
        <path d={areaPath} fill="url(#chartArea)" />

        {/* Linha principal */}
        <polyline
          points={points}
          fill="none"
          stroke="#C9A84C"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#glow)"
        />

        {/* Pontos nos dias */}
        {data.map((d, i) => {
          const isToday = d.key === todayKey;
          const cx = xOf(i);
          const cy = yOf(d.value);
          if (isToday) {
            return (
              <g key={i}>
                {/* Anel pulsante */}
                <circle cx={cx} cy={cy} r="8" fill="rgba(201,168,76,0.15)" className="chart-pulse-dot" />
                {/* Ponto sólido */}
                <circle cx={cx} cy={cy} r="4" fill="#C9A84C"
                  stroke="var(--bg)" strokeWidth="2" filter="url(#glow)" />
              </g>
            );
          }
          return d.value > 0 ? (
            <circle key={i} cx={cx} cy={cy} r="3" fill="#C9A84C"
              stroke="var(--bg)" strokeWidth="1.5" opacity="0.7" />
          ) : null;
        })}

        {/* Labels do eixo X */}
        {data.map((d, i) => {
          if (i % labelStep !== 0 && i !== data.length - 1) return null;
          const isToday = d.key === todayKey;
          return (
            <text key={i} x={xOf(i)} y={H - 6} fill={isToday ? '#C9A84C' : 'rgba(107,107,138,0.7)'}
              fontSize="9" textAnchor="middle" fontWeight={isToday ? '700' : '400'}>
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
