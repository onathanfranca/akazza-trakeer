// src/pages/Landing.js
import React, { useEffect } from 'react';

export default function Landing() {
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.lp-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .lp-wrap *, .lp-wrap *::before, .lp-wrap *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lp-wrap {
          --lp-gold: #C9A84C;
          --lp-gold-hover: #A67C32;
          --lp-gold-dim: rgba(201,168,76,0.12);
          --lp-gold-border: rgba(201,168,76,0.28);
          --lp-bg: #0a0a0a;
          --lp-card: #111111;
          --lp-card2: #161616;
          --lp-text: #f0ede6;
          --lp-muted: #888880;
          --lp-dim: #333330;
          --lp-border: rgba(255,255,255,0.06);
          --lp-border2: rgba(255,255,255,0.1);
          background: var(--lp-bg);
          color: var(--lp-text);
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          line-height: 1.6;
          min-height: 100vh;
        }

        .lp-glow {
          position: fixed; top: -200px; left: 50%; transform: translateX(-50%);
          width: 900px; height: 700px;
          background: radial-gradient(ellipse at center, rgba(201,168,76,0.07) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 2.5rem; height: 64px;
          background: rgba(10,10,10,0.88);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--lp-border);
        }
        .lp-nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; letter-spacing: 0.04em; color: var(--lp-text); }
        .lp-nav-logo span { color: var(--lp-gold); }
        .lp-btn-nav {
          background: var(--lp-gold); color: #0a0a0a; text-decoration: none;
          font-weight: 700; font-size: 0.82rem; letter-spacing: 0.06em;
          text-transform: uppercase; padding: 10px 22px; border-radius: 6px;
          transition: background 0.2s;
        }
        .lp-btn-nav:hover { background: var(--lp-gold-hover); }

        .lp-hero {
          position: relative; z-index: 1;
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center; text-align: center;
          padding: 120px 2rem 80px;
        }
        .lp-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--lp-gold-dim); border: 1px solid var(--lp-gold-border);
          border-radius: 100px; padding: 6px 18px;
          font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--lp-gold); margin-bottom: 2rem;
          animation: lpFadeUp 0.6s ease both;
        }
        .lp-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--lp-gold); animation: lpBlink 2s infinite; }
        @keyframes lpBlink { 0%,100%{opacity:1} 50%{opacity:0.2} }

        .lp-hero h1 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(3.5rem, 10vw, 7.5rem);
          line-height: 0.93; letter-spacing: 0.02em; color: var(--lp-text);
          margin-bottom: 1.5rem; animation: lpFadeUp 0.6s 0.1s ease both;
        }
        .lp-hero h1 em { font-style: normal; color: var(--lp-gold); }

        .lp-hero p {
          max-width: 520px; font-size: 1.1rem; color: var(--lp-muted);
          font-weight: 300; margin-bottom: 2.5rem;
          animation: lpFadeUp 0.6s 0.2s ease both;
          line-height: 1.7;
        }

        .lp-cta { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; animation: lpFadeUp 0.6s 0.3s ease both; }
        @keyframes lpFadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }

        .lp-btn-primary {
          display: inline-block; background: var(--lp-gold); color: #0a0a0a;
          text-decoration: none; font-weight: 700; font-size: 0.88rem;
          letter-spacing: 0.06em; text-transform: uppercase;
          padding: 15px 34px; border-radius: 6px; transition: background 0.2s, transform 0.15s;
        }
        .lp-btn-primary:hover { background: var(--lp-gold-hover); transform: translateY(-2px); }

        .lp-btn-ghost {
          display: inline-block; background: transparent; color: var(--lp-muted);
          text-decoration: none; font-weight: 500; font-size: 0.88rem;
          letter-spacing: 0.04em; padding: 15px 34px; border-radius: 6px;
          border: 1px solid var(--lp-border2); transition: border-color 0.2s, color 0.2s;
        }
        .lp-btn-ghost:hover { border-color: var(--lp-gold-border); color: var(--lp-gold); }

        .lp-stats { position: relative; z-index: 1; display: flex; justify-content: center; border-top: 1px solid var(--lp-border); border-bottom: 1px solid var(--lp-border); background: var(--lp-card); }
        .lp-stat { flex: 1; max-width: 220px; padding: 1.8rem 1.25rem; text-align: center; border-right: 1px solid var(--lp-border); }
        .lp-stat:last-child { border-right: none; }
        .lp-stat-num { font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem; color: var(--lp-gold); letter-spacing: 0.02em; }
        .lp-stat-label { font-size: 0.75rem; color: var(--lp-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }

        .lp-mockup-section { position: relative; z-index: 1; padding: 5rem 2rem; text-align: center; }
        .lp-section-label { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--lp-gold); margin-bottom: 0.75rem; display: block; }
        .lp-section-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2rem, 5vw, 3.5rem); letter-spacing: 0.02em; line-height: 1; margin-bottom: 1rem; }
        .lp-section-sub { color: var(--lp-muted); font-size: 1rem; font-weight: 300; max-width: 480px; margin: 0 auto 3rem; line-height: 1.7; }

        .lp-phone-frame {
          display: inline-block; width: 300px;
          background: #0d0d0d; border: 2px solid rgba(201,168,76,0.35);
          border-radius: 36px; padding: 12px;
          box-shadow: 0 60px 120px rgba(0,0,0,0.7), 0 0 60px rgba(201,168,76,0.06);
        }
        .lp-phone-notch { width: 80px; height: 20px; background: #0d0d0d; border-radius: 0 0 14px 14px; margin: 0 auto 6px; border: 2px solid #1a1a1a; border-top: none; }
        .lp-phone-screen { background: #0f0f0f; border-radius: 22px; overflow: hidden; max-height: 560px; overflow-y: auto; scrollbar-width: none; }
        .lp-phone-screen::-webkit-scrollbar { display: none; }

        .lp-app-header { background: #111; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; }
        .lp-app-logo { font-family: 'Bebas Neue', sans-serif; font-size: 0.95rem; letter-spacing: 0.06em; color: #f0ede6; }
        .lp-app-logo span { color: var(--lp-gold); }
        .lp-app-avatar { width: 26px; height: 26px; border-radius: 50%; background: var(--lp-gold-dim); border: 1px solid var(--lp-gold-border); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 600; color: var(--lp-gold); }

        .lp-period-tabs { display: flex; gap: 5px; padding: 8px 12px; background: #111; }
        .lp-period-tab { padding: 4px 10px; border-radius: 20px; font-size: 0.65rem; font-weight: 500; color: var(--lp-muted); border: 1px solid rgba(255,255,255,0.08); background: transparent; }
        .lp-period-tab.active { background: var(--lp-gold); color: #0a0a0a; border-color: var(--lp-gold); font-weight: 700; }

        .lp-app-chart { background: #111; padding: 8px 12px 12px; border-bottom: 1px solid var(--lp-border); }
        .lp-chart-svg { width: 100%; height: 72px; display: block; }

        .lp-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: rgba(255,255,255,0.05); }
        .lp-metric { background: #111; padding: 10px 12px; }
        .lp-metric-label { font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.1em; color: #444440; margin-bottom: 3px; }
        .lp-metric-value { font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; letter-spacing: 0.02em; color: #f0ede6; }
        .lp-metric-value.gold { color: var(--lp-gold); }
        .lp-metric-value.red { color: #e05050; }
        .lp-metric-value.green { color: #4caf7d; }

        .lp-meta { background: #111; padding: 10px 12px; border-top: 1px solid var(--lp-border); border-bottom: 1px solid var(--lp-border); }
        .lp-meta-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
        .lp-meta-label { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #555550; }
        .lp-meta-value { font-family: 'Bebas Neue', sans-serif; font-size: 1rem; color: var(--lp-gold); }
        .lp-meta-sub { font-size: 0.58rem; color: #555550; margin-bottom: 6px; }
        .lp-meta-track { height: 4px; background: #222; border-radius: 3px; overflow: hidden; }
        .lp-meta-fill { height: 100%; background: var(--lp-gold); border-radius: 3px; width: 78%; }

        .lp-app-section-title { padding: 10px 12px 6px; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #555550; background: #111; }
        .lp-house-tabs { display: flex; gap: 5px; padding: 0 12px 8px; background: #111; }
        .lp-house-tab { padding: 3px 9px; border-radius: 20px; font-size: 0.6rem; font-weight: 600; color: var(--lp-muted); border: 1px solid rgba(255,255,255,0.08); background: transparent; }
        .lp-house-tab.active { background: rgba(201,168,76,0.12); color: var(--lp-gold); border-color: var(--lp-gold-border); }

        .lp-sub-card { background: #111; border-top: 1px solid rgba(255,255,255,0.05); padding: 12px; }
        .lp-sub-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .lp-sub-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.62rem; font-weight: 700; flex-shrink: 0; }
        .lp-sub-avatar.a1 { background: rgba(201,168,76,0.2); color: var(--lp-gold); }
        .lp-sub-avatar.a2 { background: rgba(76,175,125,0.2); color: #4caf7d; }
        .lp-sub-avatar.a3 { background: rgba(100,120,255,0.2); color: #6478ff; }
        .lp-sub-avatar.a4 { background: rgba(255,100,100,0.2); color: #ff6464; }
        .lp-sub-name { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #ddd; }
        .lp-badge-admin { display: inline-block; background: rgba(201,168,76,0.15); color: var(--lp-gold); font-size: 0.5rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 1px 5px; border-radius: 4px; margin-left: 5px; }
        .lp-sub-cpas { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; color: #f0ede6; letter-spacing: 0.02em; line-height: 1; margin-bottom: 2px; }
        .lp-sub-cpas span { font-family: 'DM Sans', sans-serif; font-size: 0.58rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: #555550; margin-left: 3px; }
        .lp-sub-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 10px; margin-top: 6px; }
        .lp-sub-stat-label { font-size: 0.52rem; text-transform: uppercase; letter-spacing: 0.08em; color: #444440; margin-bottom: 1px; }
        .lp-sub-stat-value { font-size: 0.72rem; font-weight: 600; color: #f0ede6; }
        .lp-sub-stat-value.red { color: #e05050; }
        .lp-sub-stat-value.green { color: #4caf7d; }

        .lp-section { position: relative; z-index: 1; max-width: 1080px; margin: 0 auto; padding: 5rem 2rem; }

        .lp-features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1px; background: var(--lp-border); border: 1px solid var(--lp-border); border-radius: 12px; overflow: hidden; }
        .lp-feature-card { background: var(--lp-card); padding: 1.75rem; transition: background 0.2s; }
        .lp-feature-card:hover { background: var(--lp-card2); }
        .lp-feature-icon { width: 40px; height: 40px; border-radius: 8px; background: var(--lp-gold-dim); border: 1px solid var(--lp-gold-border); display: flex; align-items: center; justify-content: center; font-size: 1.15rem; margin-bottom: 1.1rem; }
        .lp-feature-card h3 { font-size: 0.95rem; font-weight: 600; margin-bottom: 0.45rem; color: var(--lp-text); }
        .lp-feature-card p { font-size: 0.9rem; color: var(--lp-muted); font-weight: 300; line-height: 1.7; }

        .lp-steps { display: flex; flex-direction: column; position: relative; }
        .lp-steps::before { content: ''; position: absolute; left: 19px; top: 40px; bottom: 40px; width: 1px; background: linear-gradient(180deg, var(--lp-gold) 0%, var(--lp-border) 100%); }
        .lp-step { display: flex; gap: 1.75rem; padding: 1.75rem 0; border-bottom: 1px solid var(--lp-border); }
        .lp-step:last-child { border-bottom: none; }
        .lp-step-num { width: 38px; height: 38px; border-radius: 50%; background: var(--lp-gold); color: #0a0a0a; font-family: 'Bebas Neue', sans-serif; font-size: 1.05rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; z-index: 1; margin-top: 4px; }
        .lp-step-content h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.35rem; }
        .lp-step-content p { font-size: 0.9rem; color: var(--lp-muted); font-weight: 300; line-height: 1.7; }

        .lp-pricing-wrap { position: relative; z-index: 1; padding: 5rem 2rem; text-align: center; border-top: 1px solid var(--lp-border); }
        .lp-pricing-card { display: inline-block; width: 100%; max-width: 420px; background: var(--lp-card); border: 1px solid var(--lp-gold-border); border-radius: 16px; padding: 2.5rem; text-align: left; position: relative; overflow: hidden; margin-top: 3rem; }
        .lp-pricing-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--lp-gold), transparent); }
        .lp-pricing-badge { display: inline-block; background: var(--lp-gold-dim); border: 1px solid var(--lp-gold-border); color: var(--lp-gold); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 12px; border-radius: 100px; margin-bottom: 1.5rem; }
        .lp-pricing-price { margin-bottom: 0.25rem; display: flex; align-items: flex-start; gap: 2px; }
        .lp-pricing-currency { font-size: 1rem; font-weight: 500; color: var(--lp-muted); margin-top: 10px; }
        .lp-pricing-amount { font-family: 'Bebas Neue', sans-serif; font-size: 4rem; letter-spacing: 0.02em; color: var(--lp-gold); line-height: 1; }
        .lp-pricing-cents { font-family: 'Bebas Neue', sans-serif; font-size: 2rem; color: var(--lp-gold); margin-top: 10px; }
        .lp-pricing-period { font-size: 0.85rem; color: var(--lp-muted); margin-bottom: 2rem; }
        .lp-pricing-divider { height: 1px; background: var(--lp-border); margin: 1.5rem 0; }
        .lp-pricing-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 0.9rem; font-size: 0.9rem; color: var(--lp-muted); }
        .lp-pricing-check { width: 18px; height: 18px; border-radius: 50%; background: rgba(76,175,125,0.15); border: 1px solid rgba(76,175,125,0.3); display: flex; align-items: center; justify-content: center; font-size: 0.62rem; color: #4caf7d; flex-shrink: 0; margin-top: 2px; }
        .lp-btn-pricing { display: block; width: 100%; text-align: center; background: var(--lp-gold); color: #0a0a0a; text-decoration: none; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase; padding: 16px; border-radius: 8px; margin-top: 2rem; transition: background 0.2s; }
        .lp-btn-pricing:hover { background: var(--lp-gold-hover); }
        .lp-pricing-note { font-size: 0.75rem; color: var(--lp-dim); text-align: center; margin-top: 1rem; }

        .lp-cta-section { position: relative; z-index: 1; text-align: center; padding: 5rem 2rem; border-top: 1px solid var(--lp-border); }
        .lp-cta-section::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 500px; height: 300px; background: radial-gradient(ellipse at top, rgba(201,168,76,0.09) 0%, transparent 70%); pointer-events: none; }
        .lp-cta-section h2 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2.5rem, 6vw, 4.5rem); letter-spacing: 0.02em; margin-bottom: 0.75rem; }
        .lp-cta-section h2 em { font-style: normal; color: var(--lp-gold); }
        .lp-cta-section p { color: var(--lp-muted); font-size: 1rem; font-weight: 300; margin-bottom: 2.5rem; line-height: 1.7; }

        .lp-footer { position: relative; z-index: 1; text-align: center; padding: 2rem; border-top: 1px solid var(--lp-border); font-size: 0.78rem; color: var(--lp-dim); }
        .lp-footer span { color: var(--lp-gold); }

        .lp-reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .lp-reveal.visible { opacity: 1; transform: translateY(0); }

        @media (max-width: 640px) {
          .lp-nav { padding: 0 1.25rem; }
          .lp-stats { flex-wrap: wrap; }
          .lp-stat { max-width: 50%; border-right: none; border-bottom: 1px solid var(--lp-border); }
          .lp-steps::before { display: none; }
        }
      `}</style>

      <div className="lp-wrap">
        <div className="lp-glow" />

        <nav className="lp-nav">
          <div className="lp-nav-logo">&#9889; AKAZZA <span>TRACKER</span></div>
          <a href="/cadastro" className="lp-btn-nav">Criar conta</a>
        </nav>

        {/* HERO */}
        <section className="lp-hero">
          <div className="lp-badge">
            <div className="lp-badge-dot" />
            Plataforma para gestores de CPAs
          </div>
          <h1>VOCÊ NO<br />CONTROLE DE<br /><em>TUDO</em></h1>
          <p>
            Chega de planilha, chega de print no grupo e chega de perder CPA por falta de organização.
            O Akazza Tracker foi feito pra quem gerencia subafiliados de verdade.
          </p>
          <div className="lp-cta">
            <a href="https://pay.lowify.com.br/checkout.php?product_id=WsYxbQ" className="lp-btn-primary">Quero assinar</a>
            <a href="#lp-como-funciona" className="lp-btn-ghost">Como funciona</a>
          </div>
        </section>

        {/* STATS */}
        <div className="lp-stats lp-reveal">
          <div className="lp-stat"><div className="lp-stat-num">100%</div><div className="lp-stat-label">Controle em tempo real</div></div>
          <div className="lp-stat"><div className="lp-stat-num">PWA</div><div className="lp-stat-label">Instale no celular</div></div>
          <div className="lp-stat"><div className="lp-stat-num">AUTO</div><div className="lp-stat-label">Aprovação automática</div></div>
          <div className="lp-stat"><div className="lp-stat-num">CSV</div><div className="lp-stat-label">Export de fechamentos</div></div>
        </div>

        {/* MOCKUP */}
        <section className="lp-mockup-section lp-reveal">
          <span className="lp-section-label">Veja por dentro</span>
          <div className="lp-section-title">É ISSO QUE VOCÊ VÊ</div>
          <div className="lp-section-sub">
            Seu painel real, com os dados que importam. Sem enrolação.
          </div>

          <div className="lp-phone-frame">
            <div className="lp-phone-notch" />
            <div className="lp-phone-screen">

              <div className="lp-app-header">
                <div style={{fontSize:'1rem',color:'#666'}}>&#9776;</div>
                <div className="lp-app-logo">&#9889; AKAZZA <span>TRACKER</span></div>
                <div className="lp-app-avatar">NZ</div>
              </div>

              <div className="lp-period-tabs">
                <div className="lp-period-tab">Hoje</div>
                <div className="lp-period-tab">7 dias</div>
                <div className="lp-period-tab active">30 dias</div>
                <div className="lp-period-tab">Custom</div>
              </div>

              <div className="lp-app-chart">
                <svg className="lp-chart-svg" viewBox="0 0 270 72" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="lpCg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.25"/>
                      <stop offset="100%" stopColor="#C9A84C" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0,65 L18,60 L36,55 L54,50 L72,36 L90,42 L108,18 L126,32 L144,12 L162,26 L180,46 L198,38 L216,50 L234,44 L252,54 L270,56 L270,72 L0,72 Z" fill="url(#lpCg)"/>
                  <path d="M0,65 L18,60 L36,55 L54,50 L72,36 L90,42 L108,18 L126,32 L144,12 L162,26 L180,46 L198,38 L216,50 L234,44 L252,54 L270,56" fill="none" stroke="#C9A84C" strokeWidth="1.5"/>
                  <text x="2" y="10" fill="#444440" fontSize="6" fontFamily="DM Sans">5k</text>
                  <text x="2" y="36" fill="#444440" fontSize="6" fontFamily="DM Sans">2.5k</text>
                  <text x="2" y="62" fill="#444440" fontSize="6" fontFamily="DM Sans">0</text>
                </svg>
              </div>

              <div className="lp-metrics">
                <div className="lp-metric"><div className="lp-metric-label">Total CPAs</div><div className="lp-metric-value">39</div></div>
                <div className="lp-metric"><div className="lp-metric-label">Faturamento</div><div className="lp-metric-value gold">R$ 4.800</div></div>
                <div className="lp-metric"><div className="lp-metric-label">Custo (dep.)</div><div className="lp-metric-value red">R$ 697,5</div></div>
                <div className="lp-metric"><div className="lp-metric-label">Lucro</div><div className="lp-metric-value green">R$ 4.102,5</div></div>
              </div>

              <div className="lp-meta">
                <div className="lp-meta-row">
                  <div className="lp-meta-label">Meta do dia</div>
                  <div className="lp-meta-value">39 / 50</div>
                </div>
                <div className="lp-meta-sub">39 de 50 CPAs &middot; Faltam 11</div>
                <div className="lp-meta-track"><div className="lp-meta-fill" /></div>
              </div>

              <div className="lp-app-section-title">&#128101; Subafiliados</div>
              <div className="lp-house-tabs">
                <div className="lp-house-tab active">Todas</div>
                <div className="lp-house-tab">SuperBet</div>
                <div className="lp-house-tab">Bet365</div>
              </div>

              {[
                { init:'NZ', cls:'a1', nome:'NATHANZIN', cpas:11, fat:'R$ 1.660', lucro:'R$ 1.401,5', custo:'R$ 258,5', cpa:'R$ 151', admin:false },
                { init:'CA', cls:'a2', nome:'CAUA', cpas:10, fat:'R$ 1.020', lucro:'R$ 914', custo:'R$ 106', cpa:'R$ 102', admin:false },
                { init:'T',  cls:'a3', nome:'TORTUGA', cpas:10, fat:'R$ 1.080', lucro:'R$ 865', custo:'R$ 215', cpa:'R$ 108', admin:false },
                { init:'MG', cls:'a4', nome:'MIGUEL', cpas:4, fat:'R$ 620', lucro:'R$ 552', custo:'R$ 68', cpa:'R$ 155', admin:true },
              ].map(s => (
                <div className="lp-sub-card" key={s.nome}>
                  <div className="lp-sub-header">
                    <div className={`lp-sub-avatar ${s.cls}`}>{s.init}</div>
                    <div>
                      <span className="lp-sub-name">{s.nome}</span>
                      {s.admin && <span className="lp-badge-admin">ADMIN</span>}
                    </div>
                  </div>
                  <div className="lp-sub-cpas">{s.cpas} <span>CPAs</span></div>
                  <div className="lp-sub-stats">
                    <div><div className="lp-sub-stat-label">Faturamento</div><div className="lp-sub-stat-value">{s.fat}</div></div>
                    <div><div className="lp-sub-stat-label">Lucro</div><div className="lp-sub-stat-value green">{s.lucro}</div></div>
                    <div><div className="lp-sub-stat-label">Custo (dep.)</div><div className="lp-sub-stat-value red">{s.custo}</div></div>
                    <div><div className="lp-sub-stat-label">R$/CPA</div><div className="lp-sub-stat-value">{s.cpa}</div></div>
                  </div>
                </div>
              ))}

            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="lp-section lp-reveal">
          <span className="lp-section-label">Funcionalidades</span>
          <div className="lp-section-title">O QUE TEM<br />LÁ DENTRO</div>
          <div className="lp-section-sub">
            Tudo que você precisava e não tinha em lugar nenhum junto.
          </div>
          <div className="lp-features-grid">
            {[
              { icon:'📊', title:'Painel em tempo real', desc:'Gráfico de CPAs por período, filtros por status e visão completa da operação. Abre o app e já sabe o que está acontecendo.' },
              { icon:'✅', title:'Aprovação do seu jeito', desc:'Quer aprovar tudo na hora? Liga o automático. Quer revisar cada um? Modo manual. Você controla o processo.' },
              { icon:'🏆', title:'Ranking de subafiliados', desc:'Veja quem está mandando bem, quem travou e quem sumiu. Valores congelados no registro, sem distorção.' },
              { icon:'💰', title:'Fechamento com um clique', desc:'Seleciona o período, gera o fechamento, exporta o CSV e paga. Sem conta de cabeça, sem erro.' },
              { icon:'📎', title:'Comprovante direto no app', desc:'O subafiliado manda a foto do comprovante pelo próprio painel. Você vê, aprova ou rejeita na hora.' },
              { icon:'🔔', title:'Notificação na hora', desc:'Cada CPA novo, cada aprovação ou rejeição chega no seu celular via Pushcut. Você não perde nada.' },
            ].map(f => (
              <div className="lp-feature-card" key={f.title}>
                <div className="lp-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section className="lp-section lp-reveal" id="lp-como-funciona">
          <span className="lp-section-label">Como funciona</span>
          <div className="lp-section-title">SEM MISTÉRIO</div>
          <div className="lp-section-sub">
            Em menos de 10 minutos você já está operando.
          </div>
          <div className="lp-steps">
            {[
              { n:1, title:'Assina e cria sua conta', desc:'Você assina, cria seu painel de admin e cadastra as casas com os valores de CPA que você paga.' },
              { n:2, title:'Convida seus subafiliados', desc:'Gera o link de convite no painel e manda pro seu time. Cada um entra e já vê só o que é dele.' },
              { n:3, title:'Eles registram, você aprova', desc:'Cada CPA entra com o comprovante. Você vê em tempo real e aprova com um toque.' },
              { n:4, title:'Fecha, exporta e paga', desc:'No fim do período você gera o fechamento, exporta o CSV e tem tudo documentado pra pagar certinho.' },
            ].map(s => (
              <div className="lp-step" key={s.n}>
                <div className="lp-step-num">{s.n}</div>
                <div className="lp-step-content"><h3>{s.title}</h3><p>{s.desc}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section className="lp-pricing-wrap lp-reveal">
          <span className="lp-section-label">Plano</span>
          <div className="lp-section-title">SEM SURPRESA<br />NO PREÇO</div>
          <div className="lp-pricing-card">
            <div className="lp-pricing-badge">Plano Mensal</div>
            <div className="lp-pricing-price">
              <span className="lp-pricing-currency">R$</span>
              <span className="lp-pricing-amount">67</span>
              <span className="lp-pricing-cents">,90</span>
            </div>
            <div className="lp-pricing-period">por mês, cancele quando quiser</div>
            <div className="lp-pricing-divider" />
            {[
              'Subafiliados ilimitados',
              'CPAs ilimitados',
              'Painel admin completo com gráficos',
              'Aprovação automática ou manual',
              'Upload de comprovantes (foto e PDF)',
              'Fechamentos e exportação CSV',
              'Notificações em tempo real via Pushcut',
              'Instala como app no celular (PWA)',
            ].map(item => (
              <div className="lp-pricing-item" key={item}>
                <div className="lp-pricing-check">&#10003;</div>
                <span>{item}</span>
              </div>
            ))}
            <a href="https://pay.lowify.com.br/checkout.php?product_id=WsYxbQ" className="lp-btn-pricing">Assinar agora</a>
            <div className="lp-pricing-note">Pagamento seguro via Lowify</div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="lp-cta-section lp-reveal">
          <h2>CHEGA DE<br /><em>PLANILHA</em></h2>
          <p>
            Você já sabe o que precisa. Assina agora e começa a usar hoje mesmo.
          </p>
          <a href="https://pay.lowify.com.br/checkout.php?product_id=WsYxbQ" className="lp-btn-primary">Assinar por R$ 67,90/mês</a>
        </section>

        <footer className="lp-footer">
          &copy; 2026 <span>Akazza Tracker</span> &nbsp;|&nbsp; Sistema de rastreamento de CPAs
        </footer>
      </div>
    </>
  );
}