// src/App.js
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useUsers, useCasas, useConfig } from './hooks/useAdmin';
import { useNotifications } from './hooks/useNotifications';

import AuthPage from './pages/AuthPage';
import AdminPainel from './pages/AdminPainel';
import Ranking from './pages/Ranking';
import MeuPainel from './pages/MeuPainel';
import Gerenciar from './pages/Gerenciar';
import Config from './pages/Config';
import Perfil from './pages/Perfil';

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

function AppInner() {
  const { currentUser, userProfile, logout, isAdmin } = useAuth();
  const { users, updateRole, removeUser } = useUsers();
  const { casas, saveCasa, addCasa, removeCasa } = useCasas();
  const { config, saveConfig } = useConfig();
  const { notify } = useNotifications();
  const [tab, setTab] = useState(isAdmin ? 'admin' : 'meu');
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    if (!isAdmin && (tab === 'admin' || tab === 'gerenciar' || tab === 'config')) {
      setTab('meu');
    }
  }, [isAdmin]);

  // Callback para admin receber notificação de CPA de qualquer afiliado
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
    { id: 'perfil', label: '👤 Perfil' },
  ];

  const AFF_TABS = [
    { id: 'meu', label: '🏠 Meu Painel' },
    { id: 'ranking', label: '🏆 Ranking' },
    { id: 'perfil', label: '👤 Perfil' },
  ];

  const tabs = isAdmin ? ADMIN_TABS : AFF_TABS;

  return (
    <div className="app-layout">
      <header className="header">
        <div className="logo" onClick={() => setTab(isAdmin ? 'admin' : 'meu')}>⚡ AKAZZA <span>TRACKER</span></div>
        <div className="header-right">
          <div style={{ cursor: 'pointer' }} onClick={() => setTab('perfil')} title="Meu Perfil">
            <Avatar foto={userProfile?.foto} nome={userProfile?.nome} size={34} />
          </div>
          <div className="user-badge">
            <strong>{userProfile?.nome || currentUser?.email}</strong>
            {isAdmin && <span className="admin-pill">ADMIN</span>}
          </div>
          <button className="btn-theme" onClick={() => setDark(d => !d)}>
            {dark ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button className="btn-logout" onClick={logout}>Sair</button>
        </div>
      </header>

      <nav className="nav-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`nav-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'admin' && isAdmin && (
          <AdminPainel
            casas={casas}
            users={users}
            metaDiaria={config.metaDiaria}
            onNewCPA={handleAdminNewCPA}
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
