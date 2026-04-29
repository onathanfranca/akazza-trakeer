// src/pages/Config.js
import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';

export default function Config({ config, saveConfig }) {
  const { showToast } = useToast();
  const [meta, setMeta] = useState(config.metaDiaria || 50);
  const aprovacaoAuto = config.aprovacaoAutomatica !== false; // default: true

  async function handleSave() {
    try {
      await saveConfig({ metaDiaria: Number(meta) });
      showToast('✅ Configurações salvas!', 'green');
    } catch { showToast('Erro ao salvar.', 'red'); }
  }

  async function toggleAprovacao() {
    try {
      await saveConfig({ aprovacaoAutomatica: !aprovacaoAuto });
      showToast(`✅ Aprovação ${!aprovacaoAuto ? 'automática' : 'manual'} ativada!`, 'green');
    } catch { showToast('Erro ao salvar.', 'red'); }
  }

  return (
    <div className="fade-in">
      <div className="config-box">
        <div className="config-title">CONFIGURAÇÕES GERAIS</div>

        {/* Meta diária */}
        <div className="config-row">
          <div className="config-label">Meta diária de CPAs</div>
          <input
            className="input-config"
            type="number"
            min="1"
            value={meta}
            onChange={e => setMeta(e.target.value)}
          />
        </div>
        <div className="config-row">
          <button className="btn-save" onClick={handleSave}>✅ Salvar</button>
        </div>
      </div>

      {/* Aprovação de CPAs */}
      <div className="config-box" style={{ marginTop: 16 }}>
        <div className="config-title">APROVAÇÃO DE CPAs</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              {aprovacaoAuto ? '⚡ Aprovação Automática' : '🔍 Aprovação Manual'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360 }}>
              {aprovacaoAuto
                ? 'CPAs são aprovados automaticamente ao serem registrados e entram nos cálculos imediatamente.'
                : 'CPAs ficam pendentes até o admin aprovar ou rejeitar. Apenas aprovados entram nos cálculos.'}
            </div>
          </div>

          {/* Toggle */}
          <div
            onClick={toggleAprovacao}
            style={{
              width: 56, height: 30, borderRadius: 99, cursor: 'pointer',
              background: aprovacaoAuto ? 'var(--green)' : 'var(--border)',
              position: 'relative', transition: 'background .2s', flexShrink: 0
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: aprovacaoAuto ? 28 : 3,
              width: 24, height: 24, borderRadius: '50%', background: '#fff',
              transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
            }} />
          </div>
        </div>

        {!aprovacaoAuto && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, fontSize: 13, color: 'var(--accent)', border: '1px solid var(--accent)' }}>
            ⚠️ Modo manual ativo — CPAs pendentes aparecerão no Painel Geral para aprovação.
          </div>
        )}
      </div>
    </div>
  );
}
