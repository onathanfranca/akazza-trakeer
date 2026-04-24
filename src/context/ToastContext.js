// src/context/ToastContext.js
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useNotifications } from '../hooks/useNotifications';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

const MESSAGES = [
  'CPA caindo na conta, só progresso 💰',
  'Que isso hein! Tá voando 🚀',
  'Meta batida! Segue o baile 🔥',
  'Continua assim que o resultado vem pesado 👊',
  '+1 CPA registrado! 🎯',
];
let msgIdx = 0;

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ msg: '', show: false, type: 'green' });
  const timer = useRef();
  const { notify } = useNotifications();

  const showToast = useCallback((msg, type = 'green') => {
    clearTimeout(timer.current);
    setToast({ msg, show: true, type });
    timer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  }, []);

  // Chamado quando o PRÓPRIO usuário registra um CPA
  const showCPAToast = useCallback((casaNome = '') => {
    const msg = MESSAGES[msgIdx % MESSAGES.length];
    msgIdx++;
    showToast(msg);
    notify({
      title: 'Novo CPA ✅',
      body: casaNome ? `+1 CPA - ${casaNome}` : '+1 CPA registrado!',
    });
  }, [showToast, notify]);

  // Chamado quando admin recebe CPA de afiliado
  const showAdminCPAToast = useCallback((casaNome = '', afiliadoNome = '') => {
    const body = afiliadoNome
      ? `${afiliadoNome} registrou +1 CPA${casaNome ? ` - ${casaNome}` : ''}`
      : `+1 CPA registrado${casaNome ? ` - ${casaNome}` : ''}`;
    showToast(body);
    notify({
      title: 'Novo CPA ✅',
      body,
    });
  }, [showToast, notify]);

  return (
    <ToastContext.Provider value={{ showToast, showCPAToast, showAdminCPAToast }}>
      {children}
      <div className={`toast${toast.show ? ' show' : ''}${toast.type !== 'green' ? ` ${toast.type}` : ''}`}>
        {toast.msg}
      </div>
    </ToastContext.Provider>
  );
}
