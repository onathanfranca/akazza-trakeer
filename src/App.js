// src/App.js
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useUsers, useCasas, useConfig } from './hooks/useAdmin';
import { useNotifications } from './hooks/useNotifications';
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
import MeusFechamentos from './pages/MeusFechamentos';

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

// Hook para contar CPAs pendentes (só usado por admins)
function usePendentesCount(isAdmin) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'cpas'), where('status', '==', 'pendente'));
    const unsub = onSnapshot(q, snap => setCount(snap.size));
    return unsub;
  }, [isAdmin]);
  return count;
}

function AppInner() {
  const { currentUser, userProfile, logout, isAdmin } = useAuth();
  const { users, updateRole, removeUser } = useUsers();
  const { casas, saveCasa, addCasa, removeCasa } = useCasas();
  const { config, saveConfig } = useConfig();
  const { notify } = useNotifications();

  const [tab, setTab] = useState(isAdmin ? 'admin' : 'meu');
  const [dark, setDark] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pendentesCount = usePendentesCount(isAdmin);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    if (!isAdmin && (tab === 'admin' || tab === 'gerenciar' || tab === 'config')) {
      setTab('meu');
    }
  }, [isAdmin]);

  // Fecha drawer ao trocar de aba
  function goTab(id) {
    setTab(id);
    setDrawerOpen(false);
  }

  // Fecha drawer ao apertar Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setDrawerOpen(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Trava scroll do body quando drawer aberto
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  function handleAdminNewCPA(cpa) {
    const user = users.find(u => u.uid === cpa.uid);
    const nome = user?.nome || 'Afiliado';
    notify({
      title: 'Novo CPA ✅',
      body: `${nome} registrou +1 CPA${cpa.casa ? ` - ${cpa.casa}` : ''}`,
    });
  }

  const ADMIN_TABS = [
    { id: 'admin', label: '📊 Painel Geral' },
    { id: 'ranking', label: '🏆 Ranking' },
    { id: 'meu', label: '🏠 Meu Painel' },
    { id: 'gerenciar', label: '👥 Afiliados' },
    { id: 'config', label: '⚙️ Config' },
    { id: 'fechamento', label: '💰 Fechamentos' },
    { id: 'perfil', label: '👤 Perfil' },
  ];

  const AFF_TABS = [
    { id: 'meu', label: '🏠 Meu Painel' },
    { id: 'ranking', label: '🏆 Ranking' },
    { id: 'meusfechamentos', label: '💰 Fechamentos' },
    { id: 'perfil', label: '👤 Perfil' },
  ];

  const tabs = isAdmin ? ADMIN_TABS : AFF_TABS;

  return (
    <div className="app-layout">

      {/* Overlay do drawer */}
      <div
        className={`drawer-overlay${drawerOpen ? ' open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer */}
      <nav className={`drawer${drawerOpen ? ' open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-logo">⚡ AKAZZA <span>TRACKER</span></div>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>

        <div className="drawer-nav">
          {tabs.map(t => {
            const isPendingTab = t.id === 'admin' && isAdmin && pendentesCount > 0;
            return (
              <button
                key={t.id}
                className={`drawer-tab${tab === t.id ? ' active' : ''}`}
                onClick={() => goTab(t.id)}
              >
                {t.label}
                {isPendingTab && (
                  <span className="drawer-tab-badge">{pendentesCount}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="drawer-footer">
          <div className="drawer-user">
            <Avatar foto={userProfile?.foto} nome={userProfile?.nome} size={36} />
            <div>
              <div className="drawer-user-name">{userProfile?.nome || currentUser?.email}</div>
              <div className="drawer-user-role">{isAdmin ? '⚡ Admin' : 'Afiliado'}</div>
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

      {/* Header */}
      <header className="header">
        {/* Botão hamburguer — canto superior esquerdo */}
        <button className="menu-toggle" onClick={() => setDrawerOpen(true)} aria-label="Abrir menu">
          <span className="menu-toggle-bar" />
          <span className="menu-toggle-bar" />
          <span className="menu-toggle-bar" />
          {isAdmin && pendentesCount > 0 && (
            <span className="menu-toggle-badge">{pendentesCount}</span>
          )}
        </button>

        {/* Logo centralizada */}
        <div className="logo" onClick={() => goTab(isAdmin ? 'admin' : 'meu')} style={{ flex: 1, textAlign: 'center' }}>
          ⚡ AKAZZA <span>TRACKER</span>
        </div>

        {/* Direita: avatar + tema */}
        <div className="header-right" style={{ flexWrap: 'nowrap' }}>
          <div style={{ cursor: 'pointer' }} onClick={() => goTab('perfil')} title="Meu Perfil">
            <Avatar foto={userProfile?.foto} nome={userProfile?.nome} size={34} />
          </div>
          {isAdmin && (
            <span className="admin-pill" style={{ whiteSpace: 'nowrap' }}>ADMIN</span>
          )}
          <button className="btn-theme" onClick={() => setDark(d => !d)}>
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main>
        {tab === 'admin' && isAdmin && (
          <AdminPainel
            casas={casas}
            users={users}
            metaDiaria={config.metaDiaria}
            onNewCPA={handleAdminNewCPA}
            config={config}
          />
        )}
        {tab === 'ranking' && (
          <Ranking casas={casas} users={users} />
        )}
        {tab === 'meu' && (
          <MeuPainel casas={casas} metaDiaria={config.metaDiaria} />
        )}
        {tab === 'gerenciar' && isAdmin && (
          <Gerenciar
            users={users} updateRole={updateRole} removeUser={removeUser}
            casas={casas} saveCasa={saveCasa} addCasa={addCasa} removeCasa={removeCasa}
          />
        )}
        {tab === 'config' && isAdmin && (
          <Config config={config} saveConfig={saveConfig} />
        )}
        {tab === 'fechamento' && isAdmin && (
          <Fechamento users={users} casas={casas} />
        )}
        {tab === 'meusfechamentos' && !isAdmin && (
          <MeusFechamentos />
        )}
        {tab === 'perfil' && (
          <Perfil />
        )}
      </main>
    </div>
  );
}

function AppGate() {
  const { currentUser } = useAuth();
  return currentUser ? <AppInner /> : <AuthPage />;
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
