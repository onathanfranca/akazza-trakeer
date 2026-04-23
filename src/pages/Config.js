// src/pages/Config.js
import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';

export default function Config({ config, saveConfig }) {
  const { showToast } = useToast();
  const [meta, setMeta] = useState(config.metaDiaria || 50);

  async function handleSave() {
    try {
      await saveConfig({ metaDiaria: Number(meta) });
      showToast('✅ Configurações salvas!', 'green');
    } catch { showToast('Erro ao salvar.', 'red'); }
  }

  return (
    <div className="fade-in">
      <div className="config-box">
        <div className="config-title">CONFIGURAÇÕES GERAIS</div>
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
    </div>
  );
}
