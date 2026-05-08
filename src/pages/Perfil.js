// src/pages/Perfil.js
import React, { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Perfil() {
  const { currentUser, userProfile, updateProfile } = useAuth();
  const { showToast } = useToast();
  const [nome, setNome] = useState(userProfile?.nome || '');
  const [pushcutUrl, setPushcutUrl] = useState(userProfile?.pushcutUrl || '');
  const [saving, setSaving] = useState(false);
  const [testando, setTestando] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(userProfile?.foto || null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fileRef = useRef();

  async function handleFotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target.result);
    reader.readAsDataURL(file);
    setUploadingFoto(true);
    try {
      const storageRef = ref(storage, `fotos/${currentUser.uid}/perfil.jpg`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateProfile(currentUser.uid, { foto: url });
      setFotoPreview(url);
      showToast('✅ Foto atualizada!', 'green');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar foto.', 'red');
    }
    setUploadingFoto(false);
  }

  async function handleSave() {
    if (!nome.trim()) { showToast('⚠️ Nome não pode ser vazio.', 'yellow'); return; }
    setSaving(true);
    try {
      await updateProfile(currentUser.uid, {
        nome: nome.trim(),
        pushcutUrl: pushcutUrl.trim()
      });
      showToast('✅ Perfil atualizado!', 'green');
    } catch { showToast('Erro ao salvar.', 'red'); }
    setSaving(false);
  }

  async function handleTestarPushcut() {
    if (!pushcutUrl.trim()) { showToast('⚠️ Cole a URL do Pushcut primeiro.', 'yellow'); return; }
    setTestando(true);
    try {
      await fetch(pushcutUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '⚡ AKAZZA TRACKER',
          text: 'Notificações configuradas com sucesso! 🔥',
        })
      });
      showToast('✅ Notificação de teste enviada!', 'green');
    } catch {
      showToast('Erro ao testar. Verifique a URL.', 'red');
    }
    setTestando(false);
  }

  return (
    <div className="fade-in" style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="manage-box" style={{ textAlign: 'center' }}>
        <div className="manage-title" style={{ textAlign: 'left' }}>👤 Meu Perfil</div>

        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, margin: '24px 0' }}>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            {fotoPreview ? (
              <img src={fotoPreview} alt="avatar" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)' }} />
            ) : (
              <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--card)', border: '3px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'var(--text-muted)' }}>
                {(userProfile?.nome || '?')[0].toUpperCase()}
              </div>
            )}
            <label style={{ position: 'absolute', bottom: 2, right: 2, background: 'var(--accent)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploadingFoto ? 'wait' : 'pointer', fontSize: 14, border: '2px solid var(--bg)' }}>
              {uploadingFoto ? '⏳' : '📷'}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} disabled={uploadingFoto} />
            </label>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {uploadingFoto ? 'Enviando foto...' : 'Clique no 📷 para trocar a foto'}
          </div>
        </div>

        {/* Campos */}
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="input-small-label">Nome</div>
            <input className="input-field" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
          </div>
          <div>
            <div className="input-small-label">E-mail</div>
            <input className="input-field" value={currentUser?.email || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>O e-mail não pode ser alterado.</div>
          </div>
          <div>
            <div className="input-small-label">Função</div>
            <input className="input-field" value={userProfile?.role === 'admin' ? 'Administrador' : 'Afiliado'} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
          </div>

          {/* PUSHCUT */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>🔔</span>
              <div className="input-small-label" style={{ margin: 0 }}>Notificações via Pushcut</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
              Receba alertas no iPhone quando seus CPAs forem aprovados ou rejeitados.{' '}
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Como configurar:</span>{' '}
              instale o app <strong>Pushcut</strong> → Automation Server → copie sua API Key → cole abaixo.
            </div>
            <input
              className="input-field"
              value={pushcutUrl}
              onChange={e => setPushcutUrl(e.target.value)}
              placeholder="https://api.pushcut.io/SUA_API_KEY/notifications/SuaNotificacao"
              style={{ fontSize: 12 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={handleTestarPushcut}
                disabled={testando || !pushcutUrl.trim()}
                style={{
                  flex: 1, padding: '9px', background: 'var(--card)', border: '1.5px solid var(--border)',
                  borderRadius: 8, color: 'var(--text)', cursor: pushcutUrl.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 600, opacity: pushcutUrl.trim() ? 1 : 0.5
                }}
              >
                {testando ? '⏳ Testando...' : '▶ Testar notificação'}
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

        <button className="btn-primary btn-full" style={{ marginTop: 20 }} onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : '💾 Salvar alterações'}
        </button>
      </div>
    </div>
  );
}
