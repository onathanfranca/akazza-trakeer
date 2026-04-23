// src/pages/Perfil.js
import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const SIZE = 200;
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        // crop centralizado
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function Perfil() {
  const { currentUser, userProfile, updateProfile } = useAuth();
  const { showToast } = useToast();
  const [nome, setNome] = useState(userProfile?.nome || '');
  const [saving, setSaving] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(userProfile?.foto || null);
  const fileRef = useRef();

  async function handleFotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setFotoPreview(compressed);
    try {
      await updateProfile(currentUser.uid, { foto: compressed });
      showToast('✅ Foto atualizada!', 'green');
    } catch { showToast('Erro ao salvar foto.', 'red'); }
  }

  async function handleSave() {
    if (!nome.trim()) { showToast('⚠️ Nome não pode ser vazio.', 'yellow'); return; }
    setSaving(true);
    try {
      await updateProfile(currentUser.uid, { nome: nome.trim() });
      showToast('✅ Perfil atualizado!', 'green');
    } catch { showToast('Erro ao salvar.', 'red'); }
    setSaving(false);
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="manage-box" style={{ textAlign: 'center' }}>
        <div className="manage-title" style={{ textAlign: 'left' }}>👤 Meu Perfil</div>

        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, margin: '24px 0' }}>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            {fotoPreview ? (
              <img src={fotoPreview} alt="avatar" style={{
                width: 100, height: 100, borderRadius: '50%', objectFit: 'cover',
                border: '3px solid var(--accent)'
              }} />
            ) : (
              <div style={{
                width: 100, height: 100, borderRadius: '50%', background: 'var(--card)',
                border: '3px solid var(--accent)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 36, color: 'var(--text-muted)'
              }}>
                {(userProfile?.nome || '?')[0].toUpperCase()}
              </div>
            )}
            {/* Botão de editar foto */}
            <label style={{
              position: 'absolute', bottom: 2, right: 2, background: 'var(--accent)',
              borderRadius: '50%', width: 28, height: 28, display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              fontSize: 14, border: '2px solid var(--bg)'
            }}>
              📷
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} />
            </label>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Clique no 📷 para trocar a foto</div>
        </div>

        {/* Campos */}
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="input-small-label">Nome</div>
            <input
              className="input-field"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
          <div>
            <div className="input-small-label">E-mail</div>
            <input
              className="input-field"
              value={currentUser?.email || ''}
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>O e-mail não pode ser alterado.</div>
          </div>
          <div>
            <div className="input-small-label">Função</div>
            <input
              className="input-field"
              value={userProfile?.role === 'admin' ? 'Administrador' : 'Afiliado'}
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>
        </div>

        <button className="btn-primary btn-full" style={{ marginTop: 20 }} onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : '💾 Salvar alterações'}
        </button>
      </div>
    </div>
  );
}
