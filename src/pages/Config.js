// src/pages/Config.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Config({ config, saveConfig, casas, saveCasa, addCasa, removeCasa }) {
  const { showToast } = useToast();
  const { currentUser, userProfile, updateProfile } = useAuth();
  const [meta, setMeta] = useState(config.metaDiaria || 50);
  const aprovacaoAuto = config.aprovacaoAutomatica !== false;

  // Casas
  const [newCasa, setNewCasa] = useState('');
  const [newValorAdmin, setNewValorAdmin] = useState('');
  const [newCustoAdmin, setNewCustoAdmin] = useState('');
  const [newValorAff, setNewValorAff] = useState('');
  const [newCustoAff, setNewCustoAff] = useState('');
  const [newLink, setNewLink] = useState('');
  const [localCasas, setLocalCasas] = useState({});
  const [savingCasas, setSavingCasas] = useState(false);

  // Pushcut
  const [pushcutUrl, setPushcutUrl] = useState(userProfile?.pushcutUrl || '');
  const [savingPushcut, setSavingPushcut] = useState(false);
  const [testando, setTestando] = useState(false);

  async function handleSaveMeta() {
    try {
      await saveConfig({ metaDiaria: Number(meta) });
      showToast('✅ Meta salva!', 'green');
    } catch { showToast('Erro ao salvar.', 'red'); }
  }

  async function toggleAprovacao() {
    try {
      await saveConfig({ aprovacaoAutomatica: !aprovacaoAuto });
      showToast(`✅ Aprovação ${!aprovacaoAuto ? 'automática' : 'manual'} ativada!`, 'green');
    } catch { showToast('Erro ao salvar.', 'red'); }
  }

  function getVal(id, field, fallback) {
    return localCasas[id]?.[field] !== undefined ? localCasas[id][field] : (fallback ?? '');
  }
  function setLocal(id, field, val) {
    setLocalCasas(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  }

  async function handleSaveCasas() {
    setSavingCasas(true);
    try {
      for (const [id, changes] of Object.entries(localCasas)) {
        const casa = casas.find(c => c.id === id);
        if (!casa) continue;
        const merged = { ...casa, ...changes };
        await saveCasa(id, {
          nome: merged.nome,
          valorAdmin: Number(merged.valorAdmin ?? merged.valor),
          custoAdmin: Number(merged.custoAdmin ?? merged.custo),
          valorAfiliado: Number(merged.valorAfiliado ?? merged.valor),
          custoAfiliado: Number(merged.custoAfiliado ?? merged.custo),
          valor: Number(merged.valorAdmin ?? merged.valor),
          custo: Number(merged.custoAdmin ?? merged.custo),
          link: merged.link ?? '',
        });
      }
      setLocalCasas({});
      showToast('✅ Valores salvos!', 'green');
    } catch { showToast('Erro ao salvar.', 'red'); }
    setSavingCasas(false);
  }

  async function handleAddCasa() {
    if (!newCasa.trim() || !newValorAdmin || !newCustoAdmin || !newValorAff || !newCustoAff) {
      showToast('⚠️ Preencha nome e valores.', 'yellow'); return;
    }
    try {
      await addCasa(newCasa.trim(), newValorAdmin, newCustoAdmin, newValorAff, newCustoAff, newLink);
      setNewCasa(''); setNewValorAdmin(''); setNewCustoAdmin(''); setNewValorAff(''); setNewCustoAff(''); setNewLink('');
      showToast('✅ Casa adicionada!', 'green');
    } catch { showToast('Erro ao adicionar casa.', 'red'); }
  }

  async function handleRemoveCasa(id) {
    if (!window.confirm('Remover esta casa?')) return;
    try { await removeCasa(id); showToast('Casa removida.', 'yellow'); }
    catch { showToast('Erro ao remover.', 'red'); }
  }

  async function handleSavePushcut() {
    setSavingPushcut(true);
    try {
      await updateProfile(currentUser.uid, { pushcutUrl: pushcutUrl.trim() });
      showToast('✅ Notificações salvas!', 'green');
    } catch { showToast('Erro ao salvar.', 'red'); }
    setSavingPushcut(false);
  }

  async function handleTestarPushcut() {
    if (!pushcutUrl.trim()) { showToast('⚠️ Cole a URL do Pushcut primeiro.', 'yellow'); return; }
    setTestando(true);
    try {
      await fetch(pushcutUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '⚡ AKAZZA TRACKER', text: 'Notificações configuradas com sucesso! 🔥' })
      });
      showToast('✅ Notificação de teste enviada!', 'green');
    } catch { showToast('Erro ao testar. Verifique a URL.', 'red'); }
    setTestando(false);
  }

  return (
    <div className="fade-in">

      {/* Meta diária */}
      <div className="config-box">
        <div className="config-title">CONFIGURAÇÕES GERAIS</div>
        <div className="config-row">
          <div className="config-label">Meta diária de CPAs</div>
          <input className="input-config" type="number" min="1" value={meta} onChange={e => setMeta(e.target.value)} />
        </div>
        <div className="config-row">
          <button className="btn-save" onClick={handleSaveMeta}>✅ Salvar</button>
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
                ? 'CPAs são aprovados automaticamente ao serem registrados.'
                : 'CPAs ficam pendentes até o admin aprovar ou rejeitar.'}
            </div>
          </div>
          <div onClick={toggleAprovacao} style={{ width: 56, height: 30, borderRadius: 99, cursor: 'pointer', background: aprovacaoAuto ? 'var(--green)' : 'var(--border)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 3, left: aprovacaoAuto ? 28 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
          </div>
        </div>
        {!aprovacaoAuto && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, fontSize: 13, color: 'var(--accent)', border: '1px solid var(--accent)' }}>
            ⚠️ Modo manual ativo — CPAs pendentes aparecerão no Painel Geral para aprovação.
          </div>
        )}
      </div>

      {/* Casas de aposta */}
      <div className="manage-box" style={{ marginTop: 16 }}>
        <div className="manage-title">
          🏠 Casas de aposta — Valores por CPA
          <span style={{ color: 'var(--accent)', fontSize: 10, marginLeft: 8 }}>🔒 ADMIN ONLY</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, 85px) 1fr 32px', gap: 6, marginBottom: 6, padding: '0 4px' }}>
          <div />
          <div style={{ fontSize: 10, color: 'var(--accent)', textAlign: 'center' }}>Val. Admin</div>
          <div style={{ fontSize: 10, color: 'var(--accent)', textAlign: 'center' }}>Custo Admin</div>
          <div style={{ fontSize: 10, color: '#4ea', textAlign: 'center' }}>Val. Afil.</div>
          <div style={{ fontSize: 10, color: '#4ea', textAlign: 'center' }}>Custo Afil.</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>Link</div>
          <div />
        </div>

        {casas.map(casa => (
          <div key={casa.id} style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, 85px) 1fr 32px', gap: 6, alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>🏠 {casa.nome}</div>
            <input className="input-small" type="number" placeholder="R$" value={getVal(casa.id, 'valorAdmin', casa.valorAdmin ?? casa.valor)} onChange={e => setLocal(casa.id, 'valorAdmin', e.target.value)} />
            <input className="input-small" type="number" placeholder="R$" value={getVal(casa.id, 'custoAdmin', casa.custoAdmin ?? casa.custo)} onChange={e => setLocal(casa.id, 'custoAdmin', e.target.value)} />
            <input className="input-small" type="number" placeholder="R$" value={getVal(casa.id, 'valorAfiliado', casa.valorAfiliado ?? casa.valor)} onChange={e => setLocal(casa.id, 'valorAfiliado', e.target.value)} />
            <input className="input-small" type="number" placeholder="R$" value={getVal(casa.id, 'custoAfiliado', casa.custoAfiliado ?? casa.custo)} onChange={e => setLocal(casa.id, 'custoAfiliado', e.target.value)} />
            <input className="input-small" type="text" placeholder="https://..." style={{ width: '100%' }} value={getVal(casa.id, 'link', casa.link ?? '')} onChange={e => setLocal(casa.id, 'link', e.target.value)} />
            <button className="btn-danger" onClick={() => handleRemoveCasa(casa.id)}>✕</button>
          </div>
        ))}

        <div style={{ marginTop: 16, padding: '12px', background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>➕ Nova casa</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input className="input-field" placeholder="Nome da casa" style={{ flex: 2, minWidth: 120 }} value={newCasa} onChange={e => setNewCasa(e.target.value)} />
            <input className="input-small" type="number" placeholder="Val. Admin" value={newValorAdmin} onChange={e => setNewValorAdmin(e.target.value)} />
            <input className="input-small" type="number" placeholder="Custo Admin" value={newCustoAdmin} onChange={e => setNewCustoAdmin(e.target.value)} />
            <input className="input-small" type="number" placeholder="Val. Afil." value={newValorAff} onChange={e => setNewValorAff(e.target.value)} />
            <input className="input-small" type="number" placeholder="Custo Afil." value={newCustoAff} onChange={e => setNewCustoAff(e.target.value)} />
            <input className="input-field" placeholder="Link de divulgação (opcional)" style={{ flex: 3, minWidth: 200 }} value={newLink} onChange={e => setNewLink(e.target.value)} />
            <button className="btn-save" onClick={handleAddCasa}>+ Add</button>
          </div>
        </div>

        <div style={{ marginTop: 14, textAlign: 'right' }}>
          <button className="btn-save" onClick={handleSaveCasas} disabled={savingCasas}>
            {savingCasas ? 'Salvando...' : '💾 Salvar valores'}
          </button>
        </div>
      </div>

      {/* Notificações Pushcut */}
      <div className="config-box" style={{ marginTop: 16 }}>
        <div className="config-title">🔔 NOTIFICAÇÕES (PUSHCUT)</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
          Receba alertas no iPhone quando CPAs forem aprovados ou rejeitados.{' '}
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Como configurar:</span>{' '}
          instale o app <strong>Pushcut</strong> → Automation Server → copie sua API Key → cole abaixo.
        </div>
        <input
          className="input-field"
          value={pushcutUrl}
          onChange={e => setPushcutUrl(e.target.value)}
          placeholder="https://api.pushcut.io/SUA_API_KEY/notifications/SuaNotificacao"
          style={{ fontSize: 12, marginBottom: 10 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleTestarPushcut} disabled={testando || !pushcutUrl.trim()} style={{ flex: 1, padding: '9px', background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: pushcutUrl.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, opacity: pushcutUrl.trim() ? 1 : 0.5 }}>
            {testando ? '⏳ Testando...' : '▶ Testar'}
          </button>
          <button onClick={handleSavePushcut} disabled={savingPushcut} style={{ flex: 1, padding: '9px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#000', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            {savingPushcut ? 'Salvando...' : '💾 Salvar'}
          </button>
        </div>
        {pushcutUrl.trim() && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'var(--green)' }}>Webhook configurado</span>
          </div>
        )}
      </div>
    </div>
  );
}