// src/components/Comprovantes.js
import React from 'react';

export function normalizar(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    const tipo = item.includes('.pdf') || item.includes('application%2Fpdf') ? 'pdf' : 'imagem';
    return { url: item, tipo };
  }
  if (typeof item === 'object' && item.url) return item;
  if (typeof item === 'object' && item.preview) {
    const tipo = item.file?.type === 'application/pdf' ? 'pdf' : 'imagem';
    return { url: item.preview, tipo, local: true };
  }
  return null;
}

export function getComprovantesNormalizados(cpa) {
  if (cpa.comprovantes?.length > 0) return cpa.comprovantes;
  if (cpa.comprovante) return [cpa.comprovante];
  return [];
}

async function downloadArquivo(url, tipo) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `comprovante.${tipo === 'pdf' ? 'pdf' : 'jpg'}`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch { window.open(url, '_blank'); }
}

function BtnDownload({ url, tipo, idx }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); downloadArquivo(url, tipo); }}
      title="Download"
      style={{
        position: 'absolute', bottom: -6, right: -6,
        background: 'var(--accent)', border: 'none', borderRadius: '50%',
        width: 20, height: 20, display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', fontSize: 10, color: '#000', zIndex: 2
      }}
    >⬇</button>
  );
}

export function ComprovanteThumbnail({ item, idx, onClick, size = 38 }) {
  const c = normalizar(item);
  if (!c) return null;
  if (c.tipo === 'pdf') return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div onClick={() => onClick?.(c)} style={{
        width: size, height: size, borderRadius: 6, cursor: 'pointer',
        border: '1.5px solid var(--accent)', background: 'var(--surface)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1
      }}>
        <span style={{ fontSize: size * 0.38 }}>📄</span>
        <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>PDF</span>
      </div>
      {!c.local && <BtnDownload url={c.url} tipo="pdf" idx={idx} />}
    </div>
  );
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <img src={c.url} alt={`comp ${idx+1}`} onClick={() => onClick?.(c)}
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1.5px solid var(--accent)', display: 'block' }} />
      {!c.local && <BtnDownload url={c.url} tipo="imagem" idx={idx} />}
    </div>
  );
}

export function ComprovanteThumbnailGrande({ item, idx, onRemove, onClick }) {
  const c = normalizar(item);
  if (!c) return null;
  if (c.tipo === 'pdf') return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => onClick?.(c)} style={{
        width: 56, height: 56, borderRadius: 8, cursor: 'pointer',
        border: '2px solid var(--accent)', background: 'var(--surface)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2
      }}>
        <span style={{ fontSize: 22 }}>📄</span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>PDF</span>
      </div>
      {onRemove && <button onClick={() => onRemove(idx)} style={{ position: 'absolute', top: -6, right: -6, background: '#e53', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', fontSize: 11, cursor: 'pointer', lineHeight: '20px', padding: 0 }}>✕</button>}
    </div>
  );
  return (
    <div style={{ position: 'relative' }}>
      <img src={c.url} alt={`comp ${idx+1}`} onClick={() => onClick?.(c)}
        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid var(--accent)', display: 'block' }} />
      {onRemove && <button onClick={() => onRemove(idx)} style={{ position: 'absolute', top: -6, right: -6, background: 'var(--accent)', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#000', fontSize: 11, cursor: 'pointer', lineHeight: '20px', padding: 0 }}>✕</button>}
    </div>
  );
}

export function ComprovanteViewer({ item, onClose }) {
  const c = normalizar(item);
  if (!c) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {c.tipo === 'pdf' ? (
          <iframe src={c.url} title="PDF" style={{ width: '80vw', height: '78vh', borderRadius: 12, border: 'none', background: '#fff' }} />
        ) : (
          <img src={c.url} alt="comprovante" style={{ maxWidth: '90vw', maxHeight: '78vh', borderRadius: 12, objectFit: 'contain' }} />
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {!c.local && (
            <button onClick={() => downloadArquivo(c.url, c.tipo)} style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '8px 20px', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              ⬇ Download
            </button>
          )}
          <button onClick={onClose} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 20px', color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}>
            ✕ Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
