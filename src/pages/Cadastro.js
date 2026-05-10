// src/pages/Cadastro.js
import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export default function Cadastro() {
  const [email, setEmail] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const tenantParam = params.get('tenant');
    if (emailParam) setEmail(decodeURIComponent(emailParam));
    if (tenantParam) setTenantId(tenantParam);
  }, []);

  async function handleCadastro() {
    if (!nome.trim()) { setErro('Informe seu nome.'); return; }
    if (!email.trim()) { setErro('Email não encontrado. Use o link enviado após a compra.'); return; }
    if (senha.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return; }

    setLoading(true);
    setErro('');

    try {
      // Verifica se o tenant existe e está ativo
      let resolvedTenantId = tenantId;

      if (!resolvedTenantId) {
        const tenantsSnap = await getDocs(
          query(collection(db, 'tenants'), where('email', '==', email.toLowerCase().trim()))
        );
        if (!tenantsSnap.empty) {
          resolvedTenantId = tenantsSnap.docs[0].id;
        }
      }

      if (!resolvedTenantId) {
        setErro('Nenhuma assinatura encontrada para esse email. Verifique se usou o mesmo email da compra.');
        setLoading(false);
        return;
      }

      // Cria conta no Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);

      // Cria documento do usuário
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        role: 'admin',
        tenantId: resolvedTenantId,
        foto: null,
        createdAt: serverTimestamp(),
      });

      // Atualiza tenant com o adminUid
      await updateDoc(doc(db, 'tenants', resolvedTenantId), {
        adminUid: cred.user.uid,
        adminNome: nome.trim(),
        status: 'ativo',
      });

      setSucesso(true);
    } catch (e) {
      console.error(e);
      if (e.code === 'auth/email-already-in-use') {
        setErro('Esse email já tem uma conta. Tente fazer login.');
      } else if (e.code === 'auth/weak-password') {
        setErro('Senha muito fraca. Use pelo menos 6 caracteres.');
      } else {
        setErro('Erro ao criar conta. Tente novamente.');
      }
    }
    setLoading(false);
  }

  if (sucesso) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', padding: '2rem', textAlign: 'center'
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--accent)', marginBottom: 8 }}>
          CONTA CRIADA!
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
          Bem-vindo ao Akazza Tracker. Você já está logado!
        </div>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '12px 28px', borderRadius: 10, background: 'var(--accent)',
            border: 'none', color: '#000', cursor: 'pointer',
            fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)',
          }}
        >
          ENTRAR NO APP →
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--accent)', letterSpacing: 2 }}>
            ⚡ AKAZZA <span style={{ color: 'var(--text)' }}>TRACKER</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>
            Crie sua conta e comece a rastrear
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>SEU NOME</div>
            <input
              className="input-field"
              type="text"
              placeholder="Como você quer ser chamado?"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>EMAIL DA COMPRA</div>
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={{ background: tenantId ? 'rgba(201,168,76,0.05)' : undefined }}
            />
            {tenantId && (
              <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>
                ✅ Assinatura identificada
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>CRIE SUA SENHA</div>
            <div style={{ position: 'relative' }}>
              <input
                className="input-field"
                type={mostrarSenha ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCadastro(); }}
                style={{ paddingRight: 44 }}
              />
              <button
                onClick={() => setMostrarSenha(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 18, color: 'var(--text-muted)', padding: 0,
                }}
              >
                {mostrarSenha ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {erro && (
            <div style={{
              background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)',
              borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)'
            }}>
              ⚠️ {erro}
            </div>
          )}

          <button
            onClick={handleCadastro}
            disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: 10,
              background: loading ? 'var(--card)' : 'var(--accent)',
              border: 'none', color: loading ? 'var(--text-muted)' : '#000',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)',
              letterSpacing: 1, marginTop: 4,
              transition: 'all .15s',
            }}
          >
            {loading ? 'CRIANDO CONTA...' : 'CRIAR CONTA →'}
          </button>

          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Já tem conta?{' '}
            <span
              onClick={() => window.location.href = '/'}
              style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
            >
              Fazer login
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}