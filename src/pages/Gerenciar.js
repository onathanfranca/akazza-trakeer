// src/pages/Gerenciar.js
import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import AfiliadoPerfil from './AfiliadoPerfil';

export default function Gerenciar({ users, updateRole, removeUser, casas, saveCasa, addCasa, removeCasa }) {
  const { showToast } = useToast();
  const [newCasa, setNewCasa] = useState('');
  const [newValor, setNewValor] = useState('');
  const [newCusto, setNewCusto] = useState('');
  const [localCasas, setLocalCasas] = useState({});
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); // abre modal de perfil

  function getCasaVal(id, field, fallback) {
    return localCasas[id]?.[field] !== undefined ? localCasas[id][field] : fallback;
  }

  function setLocal(id, field, val) {
    setLocalCasas(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  }

  async function handleSaveCasas() {
    setSaving(true);
    try {
      for (const [id, changes] of Object.entries(localCasas)) {
        const casa = casas.find(c => c.id === id);
        if (casa) await saveCasa(id, { ...casa, ...changes, valor: Number(changes.valor ?? casa.valor), custo: Number(changes.custo ?? casa.custo) });
      }
      setLocalCasas({});
      showToast('✅ Valores salvos!', 'green');
    } catch { showToast('Erro ao salvar.', 'red'); }
    setSaving(false);
  }

  async function handleAddCasa() {
    if (!newCasa.trim() || !newValor || !newCusto) { showToast('⚠️ Preencha todos os campos.', 'yellow'); return; }
    try {
      await addCasa(newCasa.trim(), newValor, newCusto);
      setNewCasa(''); setNewValor(''); setNewCusto('');
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
      {/* Modal perfil afiliado */}
      {selectedUser && (
        <AfiliadoPerfil
          user={selectedUser}
          casas={casas}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* Users */}
      <div className="manage-box">
        <div className="manage-title">Usuários cadastrados</div>
        {users.length === 0 ? (
          <div className="empty" style={{ padding: '20px 0' }}>Nenhum usuário.</div>
        ) : (
          users.map(u => (
            <div className="user-row" key={u.id} style={{ flexWrap: 'wrap', gap: 10 }}>
              {/* Avatar + info — clicável */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, minWidth: 160 }}
                onClick={() => setSelectedUser(u)}
                title="Ver perfil completo"
              >
                {u.foto ? (
                  <img src={u.foto} alt="avatar" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', background: 'var(--card)',
                    border: '2px solid var(--accent)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 16, color: 'var(--text-muted)', flexShrink: 0
                  }}>
                    {(u.nome || '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="user-name" style={{ color: 'var(--accent)' }}>{u.nome} →</div>
                  <div className="user-email">{u.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`role-badge ${u.role === 'admin' ? 'admin' : 'aff'}`}>
                  {u.role === 'admin' ? 'ADMIN' : 'Afiliado'}
                </span>
                <select
                  className="input-field"
                  style={{ width: 'auto', padding: '5px 8px', fontSize: 12 }}
                  value={u.role}
                  onChange={e => updateRole(u.uid, e.target.value)}
                >
                  <option value="afiliado">afiliado</option>
                  <option value="admin">admin</option>
                </select>
                {u.role !== 'admin' && (
                  <button className="btn-danger" onClick={() => handleRemoveUser(u.uid, u.nome)}>✕</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Casas */}
      <div className="manage-box">
        <div className="manage-title">
          Casas de aposta — Valores por CPA
          <span style={{ color: 'var(--accent)', fontSize: 10, marginLeft: 8 }}>🔒 ADMIN ONLY</span>
        </div>

        {casas.map(casa => (
          <div className="casa-row" key={casa.id}>
            <div className="casa-row-nome">🏠 {casa.nome}</div>
            <div className="casa-inputs">
              <div>
                <div className="input-small-label">Valor / CPA</div>
                <input className="input-small" type="number" value={getCasaVal(casa.id, 'valor', casa.valor)} onChange={e => setLocal(casa.id, 'valor', e.target.value)} placeholder="R$" />
              </div>
              <div>
                <div className="input-small-label">Custo / CPA</div>
                <input className="input-small" type="number" value={getCasaVal(casa.id, 'custo', casa.custo)} onChange={e => setLocal(casa.id, 'custo', e.target.value)} placeholder="R$" />
              </div>
            </div>
            <button className="btn-danger" onClick={() => handleRemoveCasa(casa.id)}>✕</button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <input className="input-field" placeholder="Nome da casa..." style={{ flex: 1, minWidth: 120 }} value={newCasa} onChange={e => setNewCasa(e.target.value)} />
          <input className="input-small" type="number" placeholder="Valor R$" value={newValor} onChange={e => setNewValor(e.target.value)} />
          <input className="input-small" type="number" placeholder="Custo R$" value={newCusto} onChange={e => setNewCusto(e.target.value)} />
          <button className="btn-save" style={{ whiteSpace: 'nowrap' }} onClick={handleAddCasa}>+ Adicionar</button>
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
