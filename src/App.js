// src/App.js
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useUsers, useCasas, useConfig } from './hooks/useAdmin';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase/config';

import AuthPage from './pages/AuthPage';
import AdminPainel from './pages/AdminPainel';
import Ranking from './pages/Ranking';
import MeuPainel from './pages/MeuPainel';
import Gerenciar from './pages/Gerenciar';
import Config from './pages/Config';
import Perfil from './pages/Perfil';
import Fechamento from './pages/Fechamento';
import Aprovacoes from './pages/Aprovacoes';
import Links from './pages/Links';
import MeusFechamentos from './pages/MeusFechamentos';
import SuperAdmin from './pages/SuperAdmin';

import './styles/global.css';

function Avatar({ foto, nome, size = 32 }) {
  if (foto) return (
    <img src={foto} alt="avatar" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)', flexShrink: 0 }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: 'var(--card)',
      border: '2px solid var(--accent)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.4, color: 'var(--text-muted)', flexShrink: 0
    }}>
      {(nome || '?')[0].toUpperCase()}
    </div>
  );
}

export { Avatar };

function usePendentesCount(isAdmin, tenantId) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isAdmin || !tenantId) return;
    const q = query(
      collection(db, 'cpas'),
      where('tenantId', '==', tenantId),
      where('status', '==', 'pendente')
    );
    const unsub = onSnapshot(q, snap => setCount(snap.size));
    return unsub;
  }, [isAdmin, tenantId]);
  return count;
}

function AppInner() {
  const { currentUser, userProfile, logout, isAdmin, isSuperAdmin, tenantId } = useAuth();
  const { users, updateRole, removeUser } = useUsers(tenantId);
  const { casas, saveCasa, addCasa, removeCasa } = useCasas(tenantId);
  const { config, saveConfig } = useConfig(tenantId);

  const [tab, setTab] = useState(isAdmin ? 'admin' : 'meu');
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('akazza_dark_mode');
    return saved !== null ? saved === 'true' : true;
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pendentesCount = usePendentesCount(isAdmin, tenantId);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('akazza_dark_mode', String(dark));
  }, [dark]);

  useEffect(() => {
    if (!isAdmin && (tab === 'admin' || tab === 'gerenciar' || tab === 'config')) {
      setTab('meu');
    }
  }, [isAdmin]);

  function goTab(id) {
    setTab(id);
    setDrawerOpen(false);
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setDrawerOpen(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const ADMIN_TABS = [
    { id: 'admin', label: '📊 Painel Geral' },
    { id: 'ranking', label: '🏆 Ranking' },
    { id: 'aprovacoes', label: '✅ Aprovações' },
    { id: 'meu', label: '🏠 Meu Painel' },
    { id: 'gerenciar', label: '👥 Gerenciar' },
    { id: 'links', label: '🔗 Links' },
    { id: 'config', label: '⚙️ Config' },
    { id: 'fechamento', label: '💰 Fechamentos' },
    { id: 'perfil', label: '👤 Perfil' },
    ...(isSuperAdmin ? [{ id: 'superadmin', label: '🌐 Super Admin' }] : []),
  ];

  const AFF_TABS = [
    { id: 'meu', label: '🏠 Meu Painel' },
    { id: 'ranking', label: '🏆 Ranking' },
    { id: 'links', label: '🔗 Links' },
    { id: 'meusfechamentos', label: '💰 Fechamentos' },
    { id: 'perfil', label: '👤 Perfil' },
  ];

  const tabs = isAdmin ? ADMIN_TABS : AFF_TABS;

  return (
    <div className="app-layout">
      <div className={`drawer-overlay${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)} />

      <nav className={`drawer${drawerOpen ? ' open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-logo">⚡ AKAZZA <span>TRACKER</span></div>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>
        <div className="drawer-nav">
          {tabs.map(t => {
            const isPendingTab = t.id === 'aprovacoes' && isAdmin && pendentesCount > 0;
            return (
              <button key={t.id} className={`drawer-tab${tab === t.id ? ' active' : ''}`} onClick={() => goTab(t.id)}>
                {t.label}
                {isPendingTab && <span className="drawer-tab-badge">{pendentesCount}</span>}
              </button>
            );
          })}
        </div>
        <div className="drawer-footer">
          <div className="drawer-user">
            <Avatar foto={userProfile?.foto} nome={userProfile?.nome} size={36} />
            <div>
              <div className="drawer-user-name">{userProfile?.nome || currentUser?.email}</div>
              <div className="drawer-user-role">
                {isSuperAdmin ? '👑 Super Admin' : isAdmin ? '⚡ Admin' : 'Afiliado'}
              </div>
            </div>
          </div>
          <div className="drawer-actions">
            <button className="btn-theme" style={{ flex: 1 }} onClick={() => setDark(d => !d)}>
              {dark ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button className="btn-logout" style={{ flex: 1 }} onClick={logout}>Sair</button>
          </div>
        </div>
      </nav>

      <header className="header">
        <button className="menu-toggle" onClick={() => setDrawerOpen(true)} aria-label="Abrir menu">
          <span className="menu-toggle-bar" />
          <span className="menu-toggle-bar" />
          <span className="menu-toggle-bar" />
          {isAdmin && pendentesCount > 0 && <span className="menu-toggle-badge">{pendentesCount}</span>}
        </button>
        <div className="logo" onClick={() => goTab(isAdmin ? 'admin' : 'meu')} style={{ flex: 1, textAlign: 'center' }}>
          ⚡ AKAZZA <span>TRACKER</span>
        </div>
        <div className="header-right" style={{ flexWrap: 'nowrap' }}>
          <div style={{ cursor: 'pointer' }} onClick={() => goTab('perfil')} title="Meu Perfil">
            <Avatar foto={userProfile?.foto} nome={userProfile?.nome} size={34} />
          </div>
          {isSuperAdmin && <span className="admin-pill" style={{ whiteSpace: 'nowrap', background: 'var(--accent)' }}>👑 SUPER</span>}
          {isAdmin && !isSuperAdmin && <span className="admin-pill" style={{ whiteSpace: 'nowrap' }}>ADMIN</span>}
          <button className="btn-theme" onClick={() => setDark(d => !d)}>{dark ? '☀️' : '🌙'}</button>
        </div>
      </header>

      <main>
        {tab === 'admin' && isAdmin && <AdminPainel casas={casas} users={users} metaDiaria={config.metaDiaria} config={config} tenantId={tenantId} />}
        {tab === 'aprovacoes' && isAdmin && <Aprovacoes casas={casas} users={users} tenantId={tenantId} />}
        {tab === 'ranking' && <Ranking casas={casas} users={users} tenantId={tenantId} />}
        {tab === 'meu' && <MeuPainel casas={casas} metaDiaria={config.metaDiaria} tenantId={tenantId} />}
        {tab === 'links' && <Links casas={casas} />}
        {tab === 'gerenciar' && isAdmin && <Gerenciar users={users} updateRole={updateRole} removeUser={removeUser} casas={casas} saveCasa={saveCasa} addCasa={addCasa} removeCasa={removeCasa} />}
        {tab === 'config' && isAdmin && <Config config={config} saveConfig={saveConfig} />}
        {tab === 'fechamento' && isAdmin && <Fechamento users={users} casas={casas} tenantId={tenantId} />}
        {tab === 'meusfechamentos' && !isAdmin && <MeusFechamentos tenantId={tenantId} />}
        {tab === 'perfil' && <Perfil />}
        {tab === 'superadmin' && isSuperAdmin && <SuperAdmin />}
      </main>
    </div>
  );
}

function BlockedScreen() {
  const { logout } = useAuth();
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '2rem', textAlign: 'center'
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--accent)', marginBottom: 8 }}>
        ACESSO BLOQUEADO
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 320, marginBottom: 24 }}>
        Sua assinatura está inativa. Entre em contato com o administrador para reativar o acesso.
      </div>
      <button onClick={logout}
        style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
        Sair
      </button>
    </div>
  );
}

function AppGate() {
  const { currentUser, tenantAtivo } = useAuth();
  if (!currentUser) return <AuthPage />;
  if (tenantAtivo === false) return <BlockedScreen />;
  return <AppInner />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppGate />
      </ToastProvider>
    </AuthProvider>
  );
}