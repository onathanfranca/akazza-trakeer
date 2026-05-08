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

// ─── Helper: formata valor em BRL ────────────────────────────────────────────
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

  // ── FCM: mesma lógica anterior ──
  const valorFCM = casaData
    ? (ownerRole === "admin" ? (casaData.valorAdmin ?? casaData.valor ?? 0) : (casaData.valorAfiliado ?? casaData.valor ?? 0))
    : 0;
  const valorFmtFCM = valorFCM > 0 ? `+${fmtBRL(valorFCM)}` : "+1 CPA";
  const mensagensFCM = [];
  for (const user of users) {
    if (!user.fcmToken) continue;
    const isAdmin = user.role === "admin";
    const isOwner = user.id === uid;
    if (ownerRole === "admin" && !isAdmin) continue;
    if (ownerRole !== "admin" && !isOwner && !isAdmin) continue;
    mensagensFCM.push(buildMsg(user.fcmToken, "Novo CPA 💰", valorFmtFCM));
  }
  await enviarMensagens(messaging, db, mensagensFCM, users);

  // ── PUSHCUT para admins: "NOME REGISTROU CPA — +R$50,00 pra conta!" ──
  // Margem admin = valorAdmin - valorAfiliado
  const valorAdmin = casaData ? (casaData.valorAdmin ?? casaData.valor ?? 0) : 0;
  const valorAfiliado = casaData ? (casaData.valorAfiliado ?? casaData.valor ?? 0) : 0;
  const margemAdmin = valorAdmin - valorAfiliado;
  const nomeAfiliado = (owner.nome || "Afiliado").toUpperCase();

  const pushcutTitleAdmin = `${nomeAfiliado} REGISTROU CPA`;
  const pushcutTextAdmin = margemAdmin > 0
    ? `+${fmtBRL(margemAdmin)} pra conta! 💰`
    : `Casa: ${casaNome || "—"}`;

  const pushcutPromises = [];
  for (const admin of admins) {
    if (admin.pushcutUrl) {
      pushcutPromises.push(dispararPushcut(admin.pushcutUrl, pushcutTitleAdmin, pushcutTextAdmin));
    }
  }
  await Promise.all(pushcutPromises);
});

// ─── Notifica mudança de status do CPA (aprovação/rejeição) ──────────────────
exports.notificarStatusCPA = onDocumentUpdated("cpas/{cpaId}", async (event) => {
  const antes = event.data.before.data();
  const depois = event.data.after.data();
  if (!antes || !depois) return;
  if (antes.status === depois.status) return;

  const novoStatus = depois.status;
  if (novoStatus !== "aprovado" && novoStatus !== "rejeitado") return;

  const db = getFirestore();
  const messaging = getMessaging();
  const uid = depois.uid;
  const casaNome = depois.casa || "";

  // Busca dono do CPA
  const userSnap = await db.collection("users").doc(uid).get();
  const user = userSnap.data();
  if (!user) return;
  const userRole = user.role || "afiliado";

  // Busca casa
  let casaData = null;
  if (casaNome) {
    const casaId = casaNome.toLowerCase().replace(/[\s/\\]+/g, "_");
    const casaSnap = await db.collection("casas").doc(casaId).get();
    if (casaSnap.exists) casaData = casaSnap.data();
  }

  // Busca admins
  const usersSnap = await db.collection("users").get();
  const admins = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === "admin");

  // ── Calcula valores ──
  // Valor líquido do dono: valorCPA - valorDeposito
  const valorCPA = depois.valorCPA != null
    ? Number(depois.valorCPA)
    : (casaData ? (userRole === "admin" ? (casaData.valorAdmin ?? casaData.valor ?? 0) : (casaData.valorAfiliado ?? casaData.valor ?? 0)) : 0);
  const valorDeposito = Number(depois.valorDeposito || 0);
  const liquidoDono = valorCPA - valorDeposito;

  // Valor líquido admin: valorAdmin - custoAdmin
  const valorAdmin = casaData ? (casaData.valorAdmin ?? casaData.valor ?? 0) : 0;
  const custoAdmin = casaData ? (casaData.custoAdmin ?? casaData.custo ?? 0) : 0;
  const liquidoAdmin = valorAdmin - custoAdmin;

  const nomeAfiliado = (user.nome || "Afiliado").toUpperCase();

  let titleDono, textDono, titleAdmin, textAdmin;

  if (novoStatus === "aprovado") {
    titleDono = "+1 CPA APROVADO! ✅";
    textDono = liquidoDono > 0
      ? `+${fmtBRL(liquidoDono)} na conta! 💰`
      : `Casa: ${casaNome || "—"}`;

    titleAdmin = "+1 CPA APROVADO! ✅";
    textAdmin = liquidoAdmin > 0
      ? `${nomeAfiliado} • +${fmtBRL(liquidoAdmin)} na conta! 💰`
      : `${nomeAfiliado} • Casa: ${casaNome || "—"}`;
  } else {
    const motivo = depois.motivoRejeicao ? ` — ${depois.motivoRejeicao}` : "";
    titleDono = "CPA REJEITADO ❌";
    textDono = `Casa: ${casaNome || "—"}${motivo}`;

    titleAdmin = "CPA REJEITADO ❌";
    textAdmin = `${nomeAfiliado} • Casa: ${casaNome || "—"}${motivo}`;
  }

  // ── FCM para o dono ──
  if (user.fcmToken) {
    await enviarMensagens(messaging, db, [buildMsg(user.fcmToken, titleDono, textDono)], [{ id: uid, ...user }]);
  }

  // ── FCM para admins ──
  const fcmAdmins = admins.filter(a => a.fcmToken && a.id !== uid);
  if (fcmAdmins.length > 0) {
    await enviarMensagens(messaging, db, fcmAdmins.map(a => buildMsg(a.fcmToken, titleAdmin, textAdmin)), fcmAdmins);
  }

  // ── Pushcut para o dono ──
  if (user.pushcutUrl) {
    await dispararPushcut(user.pushcutUrl, titleDono, textDono);
  }

  // ── Pushcut para admins ──
  const pushcutPromises = [];
  for (const admin of admins) {
    if (admin.pushcutUrl) {
      pushcutPromises.push(dispararPushcut(admin.pushcutUrl, titleAdmin, textAdmin));
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
      if (code === "messaging/invalid-registration-token" || code === "messaging/registration-token-not-registered") {
        await db.collection("users").doc(users[idx].id).update({ fcmToken: null });
      }
    }
  });
}
