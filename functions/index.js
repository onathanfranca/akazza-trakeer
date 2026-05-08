// functions/index.js
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const https = require("https");
const http = require("http");

initializeApp();

// ─── Helper: dispara Pushcut via HTTP ────────────────────────────────────────
function dispararPushcut(webhookUrl, title, text) {
  return new Promise((resolve) => {
    if (!webhookUrl) return resolve();
    try {
      const body = JSON.stringify({ title, text });
      const url = new URL(webhookUrl);
      const lib = url.protocol === "https:" ? https : http;
      const req = lib.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      }, (res) => {
        console.log(`Pushcut → ${webhookUrl} → status ${res.statusCode}`);
        resolve();
      });
      req.on("error", (e) => { console.error("Pushcut error:", e.message); resolve(); });
      req.write(body);
      req.end();
    } catch (e) {
      console.error("Pushcut URL inválida:", e.message);
      resolve();
    }
  });
}

function fmtBRL(n) {
  return `R$ ${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

// ─── Notifica novo CPA registrado ────────────────────────────────────────────
exports.notificarNovoCPA = onDocumentCreated("cpas/{cpaId}", async (event) => {
  const cpa = event.data.data();
  if (!cpa) return;

  const db = getFirestore();
  const messaging = getMessaging();
  const uid = cpa.uid;
  const casaNome = cpa.casa || "";
  const status = cpa.status || "pendente";

  // Busca dono do CPA
  const ownerSnap = await db.collection("users").doc(uid).get();
  const owner = ownerSnap.data();
  if (!owner) return;
  const ownerRole = owner.role || "afiliado";

  // Busca casa
  let casaData = null;
  if (casaNome) {
    const casaId = casaNome.toLowerCase().replace(/[\s/\\]+/g, "_");
    const casaSnap = await db.collection("casas").doc(casaId).get();
    if (casaSnap.exists) casaData = casaSnap.data();
  }

  // Busca todos os users
  const usersSnap = await db.collection("users").get();
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const admins = users.filter(u => u.role === "admin");

  const valorAdmin = casaData ? (casaData.valorAdmin ?? casaData.valor ?? 0) : 0;
  const custoAdmin = casaData ? (casaData.custoAdmin ?? casaData.custo ?? 0) : 0;
  const valorAfiliado = casaData ? (casaData.valorAfiliado ?? casaData.valor ?? 0) : 0;
  const valorDeposito = Number(cpa.valorDeposito || 0);
  const nomeAfiliado = (owner.nome || "Afiliado").toUpperCase();

  const pushcutPromises = [];

  // ── CASO 1: Admin registra CPA próprio — sempre aprovado, notifica na hora ──
  if (ownerRole === "admin") {
    const liquidoAdmin = valorAdmin - valorDeposito;
    const titleDono = "+1 CPA REGISTRADO ✅";
    const textDono = liquidoAdmin > 0 ? `+${fmtBRL(liquidoAdmin)} pra conta! 💰` : `Casa: ${casaNome || "—"}`;

    if (owner.fcmToken) {
      await enviarMensagens(messaging, db, [buildMsg(owner.fcmToken, titleDono, textDono)], [{ id: uid, ...owner }]);
    }
    if (owner.pushcutUrl) {
      pushcutPromises.push(dispararPushcut(owner.pushcutUrl, titleDono, textDono));
    }
    await Promise.all(pushcutPromises);
    return;
  }

  // ── CASO 2: Afiliado — aprovação automática (status já aprovado no registro) ──
  if (status === "aprovado") {
    const valorCPA = cpa.valorCPA != null ? Number(cpa.valorCPA) : valorAfiliado;
    const liquidoDono = valorCPA - valorDeposito;
    const margemAdmin = valorAdmin - valorAfiliado;

    // Notifica afiliado
    const titleDono = "+1 CPA REGISTRADO ✅";
    const textDono = liquidoDono > 0 ? `+${fmtBRL(liquidoDono)} na conta! 💰` : `Casa: ${casaNome || "—"}`;

    if (owner.fcmToken) {
      await enviarMensagens(messaging, db, [buildMsg(owner.fcmToken, titleDono, textDono)], [{ id: uid, ...owner }]);
    }
    if (owner.pushcutUrl) {
      pushcutPromises.push(dispararPushcut(owner.pushcutUrl, titleDono, textDono));
    }

    // Notifica admins
    const titleAdmin = `${nomeAfiliado} REGISTROU CPA ⚡`;
    const textAdmin = margemAdmin > 0 ? `+${fmtBRL(margemAdmin)} pra conta! 💰` : `Casa: ${casaNome || "—"}`;

    const fcmAdmins = admins.filter(a => a.fcmToken && a.id !== uid);
    if (fcmAdmins.length > 0) {
      await enviarMensagens(messaging, db, fcmAdmins.map(a => buildMsg(a.fcmToken, titleAdmin, textAdmin)), fcmAdmins);
    }
    for (const admin of admins) {
      if (admin.pushcutUrl) {
        pushcutPromises.push(dispararPushcut(admin.pushcutUrl, titleAdmin, textAdmin));
      }
    }

    await Promise.all(pushcutPromises);
    return;
  }

  // ── CASO 3: Afiliado — aprovação manual (status pendente) — só avisa admins ──
  const titleAdminPendente = `${nomeAfiliado} REGISTROU CPA ⏳`;
  const textAdminPendente = `⏳ Aguardando aprovação — Casa: ${casaNome || "—"}`;

  const fcmAdminsPendente = admins.filter(a => a.fcmToken && a.id !== uid);
  if (fcmAdminsPendente.length > 0) {
    await enviarMensagens(messaging, db, fcmAdminsPendente.map(a => buildMsg(a.fcmToken, titleAdminPendente, textAdminPendente)), fcmAdminsPendente);
  }
  for (const admin of admins) {
    if (admin.pushcutUrl) {
      pushcutPromises.push(dispararPushcut(admin.pushcutUrl, titleAdminPendente, textAdminPendente));
    }
  }
  await Promise.all(pushcutPromises);
});

// ─── Notifica mudança de status (aprovação/rejeição MANUAL) ──────────────────
exports.notificarStatusCPA = onDocumentUpdated("cpas/{cpaId}", async (event) => {
  const antes = event.data.before.data();
  const depois = event.data.after.data();
  if (!antes || !depois) return;
  if (antes.status === depois.status) return;

  const novoStatus = depois.status;
  if (novoStatus !== "aprovado" && novoStatus !== "rejeitado") return;

  // Só dispara se veio de pendente (aprovação manual)
  if (antes.status !== "pendente") return;

  const db = getFirestore();
  const messaging = getMessaging();
  const uid = depois.uid;
  const casaNome = depois.casa || "";

  const userSnap = await db.collection("users").doc(uid).get();
  const user = userSnap.data();
  if (!user) return;
  const userRole = user.role || "afiliado";

  let casaData = null;
  if (casaNome) {
    const casaId = casaNome.toLowerCase().replace(/[\s/\\]+/g, "_");
    const casaSnap = await db.collection("casas").doc(casaId).get();
    if (casaSnap.exists) casaData = casaSnap.data();
  }

  const usersSnap = await db.collection("users").get();
  const admins = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === "admin");

  const valorAdmin = casaData ? (casaData.valorAdmin ?? casaData.valor ?? 0) : 0;
  const custoAdmin = casaData ? (casaData.custoAdmin ?? casaData.custo ?? 0) : 0;
  const valorAfiliado = casaData ? (casaData.valorAfiliado ?? casaData.valor ?? 0) : 0;
  const valorCPA = depois.valorCPA != null ? Number(depois.valorCPA) : (userRole === "admin" ? valorAdmin : valorAfiliado);
  const valorDeposito = Number(depois.valorDeposito || 0);
  const nomeAfiliado = (user.nome || "Afiliado").toUpperCase();

  const pushcutPromises = [];

  if (novoStatus === "aprovado") {
    const liquidoDono = valorCPA - valorDeposito;
    const margemAdmin = valorAdmin - valorAfiliado;

    const titleDono = "+1 CPA REGISTRADO ✅";
    const textDono = liquidoDono > 0 ? `+${fmtBRL(liquidoDono)} na conta! 💰` : `Casa: ${casaNome || "—"}`;
    const titleAdmin = `${nomeAfiliado} REGISTROU CPA ⚡`;
    const textAdmin = margemAdmin > 0 ? `+${fmtBRL(margemAdmin)} pra conta! 💰` : `Casa: ${casaNome || "—"}`;

    if (user.fcmToken) {
      await enviarMensagens(messaging, db, [buildMsg(user.fcmToken, titleDono, textDono)], [{ id: uid, ...user }]);
    }
    if (user.pushcutUrl) {
      pushcutPromises.push(dispararPushcut(user.pushcutUrl, titleDono, textDono));
    }

    const fcmAdmins = admins.filter(a => a.fcmToken && a.id !== uid);
    if (fcmAdmins.length > 0) {
      await enviarMensagens(messaging, db, fcmAdmins.map(a => buildMsg(a.fcmToken, titleAdmin, textAdmin)), fcmAdmins);
    }
    for (const admin of admins) {
      if (admin.pushcutUrl) {
        pushcutPromises.push(dispararPushcut(admin.pushcutUrl, titleAdmin, textAdmin));
      }
    }

  } else {
    const motivo = depois.motivoRejeicao ? ` — ${depois.motivoRejeicao}` : "";
    const titleDono = "CPA REJEITADO ❌";
    const textDono = `Casa: ${casaNome || "—"}${motivo} 😔`;
    const titleAdmin = "CPA REJEITADO ❌";
    const textAdmin = `${nomeAfiliado} • Casa: ${casaNome || "—"}${motivo}`;

    if (user.fcmToken) {
      await enviarMensagens(messaging, db, [buildMsg(user.fcmToken, titleDono, textDono)], [{ id: uid, ...user }]);
    }
    if (user.pushcutUrl) {
      pushcutPromises.push(dispararPushcut(user.pushcutUrl, titleDono, textDono));
    }

    const fcmAdmins = admins.filter(a => a.fcmToken && a.id !== uid);
    if (fcmAdmins.length > 0) {
      await enviarMensagens(messaging, db, fcmAdmins.map(a => buildMsg(a.fcmToken, titleAdmin, textAdmin)), fcmAdmins);
    }
    for (const admin of admins) {
      if (admin.pushcutUrl) {
        pushcutPromises.push(dispararPushcut(admin.pushcutUrl, titleAdmin, textAdmin));
      }
    }
  }

  await Promise.all(pushcutPromises);
});

// ─── Helpers FCM ─────────────────────────────────────────────────────────────
function buildMsg(token, title, body) {
  return {
    token,
    notification: { title, body },
    android: {
      notification: { title, body, sound: "default", channelId: "cpa_channel", priority: "high" },
      priority: "high",
    },
    apns: {
      payload: { aps: { alert: { title, body }, sound: "default", badge: 1 } },
    },
    webpush: {
      notification: { title, body, icon: "/logo192.png", badge: "/logo192.png", vibrate: [200, 100, 200] },
      fcmOptions: { link: "/" },
    },
  };
}

async function enviarMensagens(messaging, db, mensagens, users) {
  if (mensagens.length === 0) { console.log("Nenhum token FCM."); return; }
  const results = await messaging.sendEach(mensagens);
  console.log(`Enviadas: ${results.successCount} sucesso, ${results.failureCount} falha`);
  results.responses.forEach(async (resp, idx) => {
    if (!resp.success) {
      const code = resp.error?.code;
      if (
        code === "messaging/invalid-registration-token" ||
        code === "messaging/registration-token-not-registered"
      ) {
        await db.collection("users").doc(users[idx].id).update({ fcmToken: null });
      }
    }
  });
}
