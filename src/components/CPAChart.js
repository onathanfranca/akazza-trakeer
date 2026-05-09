// src/components/CPAChart.js
// Gráfico de linha — faturamento por dia, área preenchida, ponto pulsante no dia atual
// SVG puro, sem dependências externas

import React, { useMemo } from 'react';
import { format, eachDayOfInterval, parseISO } from 'date-fns';

export default function CPAChart({ cpas, dateFrom, dateTo, casas, userRole }) {
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

        // Faturamento: usa valorCPA congelado ou busca da casa
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

  const W = 600;
  const H = 110;
  const PAD_L = 44;
  const PAD_R = 16;
  const PAD_T = 12;
  const PAD_B = 24;
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

  const labelStep = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0.01" />
          </linearGradient>
          <filter id="chartGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines + labels Y em R$ */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = PAD_T + innerH * (1 - pct);
          const v = maxVal * pct;
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              {pct > 0 && (
                <text x={PAD_L - 6} y={y + 4}
                  fill="rgba(107,107,138,0.65)" fontSize="8" textAnchor="end">
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
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#chartGlow)"
          />
        )}

        {/* Pontos nos dias */}
        {data.map((d, i) => {
          const isToday = d.key === todayKey;
          const cx = xOf(i);
          const cy = yOf(d.value);
          if (isToday) {
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r="9" fill="rgba(201,168,76,0.12)" className="chart-pulse-dot" />
                <circle cx={cx} cy={cy} r="4" fill="#C9A84C"
                  stroke="var(--bg)" strokeWidth="2" filter="url(#chartGlow)" />
              </g>
            );
          }
          return (
            <circle key={i} cx={cx} cy={cy} r="2.5" fill="#C9A84C"
              stroke="var(--bg)" strokeWidth="1.5" opacity={d.value > 0 ? 0.75 : 0.2} />
          );
        })}

        {/* Labels eixo X */}
        {data.map((d, i) => {
          if (i % labelStep !== 0 && i !== data.length - 1) return null;
          const isToday = d.key === todayKey;
          return (
            <text key={i} x={xOf(i)} y={H - 4}
              fill={isToday ? '#C9A84C' : 'rgba(107,107,138,0.65)'}
              fontSize="8" textAnchor="middle" fontWeight={isToday ? '700' : '400'}>
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
