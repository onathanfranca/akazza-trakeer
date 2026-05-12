// src/pages/Equipe.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AfiliadoPerfil from './AfiliadoPerfil';

export default function Equipe({ users, updateRole, removeUser, aprovarAfiliado, recusarAfiliado, casas }) {
  const { showToast } = useToast();
  const [selectedUser, setSelectedUser] = useState(null);

  const pendentes = users.filter(u => u.role === 'afiliado' && u.status === 'pendente');

  async function handleAprovar(u) {
    try { await aprovarAfiliado(u.uid); showToast(`✅ ${u.nome} aprovado!`, 'green'); }
    catch { showToast('Erro ao aprovar.', 'red'); }
  }

  async function handleRecusar(u) {
    if (!window.confirm(`Recusar ${u.nome}?`)) return;
    try { await recusarAfiliado(u.uid); showToast(`${u.nome} recusado.`, 'yellow'); }
    catch { showToast('Erro ao recusar.', 'red'); }
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

      {/* Afiliados pendentes */}
      {pendentes.length > 0 && (
        <div className="manage-box" style={{ borderColor: 'rgba(201,168,76,0.4)' }}>
          <div className="manage-title">⏳ Aguardando aprovação <span style={{ background: 'var(--accent)', color: '#000', borderRadius: 99, fontSize: 11, padding: '2px 8px', marginLeft: 8 }}>{pendentes.length}</span></div>
          {pendentes.map(u => (
            <div className="user-row" key={u.uid} style={{ flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 160 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--card)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--muted)', flexShrink: 0 }}>
                  {(u.nome || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div className="user-name">{u.nome}</div>
                  <div className="user-email">{u.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => handleAprovar(u)} style={{ padding: '7px 16px', borderRadius: 8, background: '#1a7a1a', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>✅ Aprovar</button>
                <button onClick={() => handleRecusar(u)} style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.4)', color: '#e53935', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>✕ Recusar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usuários */}
      <div className="manage-box">
        <div className="manage-title">👥 Usuários cadastrados</div>
        {users.length === 0 ? (
          <div className="empty" style={{ padding: '20px 0' }}>Nenhum usuário.</div>
        ) : users.map(u => (
          <div className="user-row" key={u.uid} style={{ flexWrap: 'wrap', gap: 10 }}>
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
    </div>
  );
}
