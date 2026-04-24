// src/pages/Gerenciar.js
import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import AfiliadoPerfil from './AfiliadoPerfil';

export default function Gerenciar({ users, updateRole, removeUser, casas, saveCasa, addCasa, removeCasa }) {
  const { showToast } = useToast();
  const [newCasa, setNewCasa] = useState('');
  const [newValorAdmin, setNewValorAdmin] = useState('');
  const [newCustoAdmin, setNewCustoAdmin] = useState('');
  const [newValorAff, setNewValorAff] = useState('');
  const [newCustoAff, setNewCustoAff] = useState('');
  const [newLink, setNewLink] = useState('');
  const [localCasas, setLocalCasas] = useState({});
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  function getVal(id, field, fallback) {
    return localCasas[id]?.[field] !== undefined ? localCasas[id][field] : (fallback ?? '');
  }
  function setLocal(id, field, val) {
    setLocalCasas(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  }

  async function handleSaveCasas() {
    setSaving(true);
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
    setSaving(false);
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

  async function handleRemoveUser(uid, nome) {
    if (!window.confirm(`Remover ${nome}?`)) return;
    try { await removeUser(uid); showToast('Usuário removido.', 'yellow'); }
    catch { showToast('Erro ao remover usuário.', 'red'); }
  }

  return (
    <div className="fade-in">
      {selectedUser && (
        <AfiliadoPerfil user={selectedUser} casas={casas} onClose={() => setSelectedUser(null)} />
      )}

      {/* Users */}
      <div className="manage-box">
        <div className="manage-title">Usuários cadastrados</div>
        {users.length === 0 ? (
          <div className="empty" style={{ padding: '20px 0' }}>Nenhum usuário.</div>
        ) : users.map(u => (
          <div className="user-row" key={u.id} style={{ flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, minWidth: 160 }}
              onClick={() => setSelectedUser(u)} title="Ver perfil completo">
              {u.foto ? (
                <img src={u.foto} alt="avatar" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--card)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--muted)', flexShrink: 0 }}>
                  {(u.nome || '?')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="user-name" style={{ color: 'var(--accent)' }}>{u.nome} →</div>
                <div className="user-email">{u.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`role-badge ${u.role === 'admin' ? 'admin' : 'aff'}`}>{u.role === 'admin' ? 'ADMIN' : 'Afiliado'}</span>
              <select className="input-field" style={{ width: 'auto', padding: '5px 8px', fontSize: 12 }} value={u.role} onChange={e => updateRole(u.uid, e.target.value)}>
                <option value="afiliado">afiliado</option>
                <option value="admin">admin</option>
              </select>
              {u.role !== 'admin' && <button className="btn-danger" onClick={() => handleRemoveUser(u.uid, u.nome)}>✕</button>}
            </div>
          </div>
        ))}
      </div>

      {/* Casas */}
      <div className="manage-box">
        <div className="manage-title">
          Casas de aposta — Valores por CPA
          <span style={{ color: 'var(--accent)', fontSize: 10, marginLeft: 8 }}>🔒 ADMIN ONLY</span>
        </div>

        {/* Legenda */}
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
            <input className="input-small" type="number" placeholder="R$"
              value={getVal(casa.id, 'valorAdmin', casa.valorAdmin ?? casa.valor)}
              onChange={e => setLocal(casa.id, 'valorAdmin', e.target.value)} />
            <input className="input-small" type="number" placeholder="R$"
              value={getVal(casa.id, 'custoAdmin', casa.custoAdmin ?? casa.custo)}
              onChange={e => setLocal(casa.id, 'custoAdmin', e.target.value)} />
            <input className="input-small" type="number" placeholder="R$"
              value={getVal(casa.id, 'valorAfiliado', casa.valorAfiliado ?? casa.valor)}
              onChange={e => setLocal(casa.id, 'valorAfiliado', e.target.value)} />
            <input className="input-small" type="number" placeholder="R$"
              value={getVal(casa.id, 'custoAfiliado', casa.custoAfiliado ?? casa.custo)}
              onChange={e => setLocal(casa.id, 'custoAfiliado', e.target.value)} />
            <input className="input-small" type="text" placeholder="https://..."
              style={{ width: '100%' }}
              value={getVal(casa.id, 'link', casa.link ?? '')}
              onChange={e => setLocal(casa.id, 'link', e.target.value)} />
            <button className="btn-danger" onClick={() => handleRemoveCasa(casa.id)}>✕</button>
          </div>
        ))}

        {/* Nova casa */}
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
          <button className="btn-save" onClick={handleSaveCasas} disabled={saving}>
            {saving ? 'Salvando...' : '💾 Salvar valores'}
          </button>
        </div>
      </div>
    </div>
  );
}
