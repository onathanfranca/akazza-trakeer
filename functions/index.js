// functions/index.js
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

// ─── Notifica novo CPA registrado ────────────────────────────────────────────
exports.notificarNovoCPA = onDocumentCreated("cpas/{cpaId}", async (event) => {
  const cpa = event.data.data();
  if (!cpa) return;

  const db = getFirestore();
  const messaging = getMessaging();

  const casaNome = cpa.casa || "";
  const uid = cpa.uid;

  const ownerSnap = await db.collection("users").doc(uid).get();
  const owner = ownerSnap.data();
  if (!owner) return;

  const ownerRole = owner.role || "afiliado";

  let valorCPA = null;
  if (casaNome) {
    const casaId = casaNome.toLowerCase().replace(/[\s/\\]+/g, "_");
    const casaSnap = await db.collection("casas").doc(casaId).get();
    if (casaSnap.exists) {
      const casaData = casaSnap.data();
      valorCPA = ownerRole === "admin"
        ? (casaData.valorAdmin ?? casaData.valor ?? null)
        : (casaData.valorAfiliado ?? casaData.valor ?? null);
    }
  }

  const valorFmt = valorCPA != null
    ? `+R$ ${Number(valorCPA).toLocaleString("pt-BR")}`
    : "+1 CPA";

  const title = "Novo CPA 💰";
  const body = valorFmt;

  const usersSnap = await db.collection("users").get();
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const mensagens = [];
  for (const user of users) {
    if (!user.fcmToken) continue;
    const isAdmin = user.role === "admin";
    const isOwner = user.id === uid || user.uid === uid;
    if (ownerRole === "admin" && !isAdmin) continue;
    if (ownerRole !== "admin" && !isOwner && !isAdmin) continue;
    mensagens.push(buildMsg(user.fcmToken, title, body));
  }

  await enviarMensagens(messaging, db, mensagens, users);
});

// ─── Notifica mudança de status do CPA (aprovação/rejeição) ──────────────────
exports.notificarStatusCPA = onDocumentUpdated("cpas/{cpaId}", async (event) => {
  const antes = event.data.before.data();
  const depois = event.data.after.data();
  if (!antes || !depois) return;

  // Só dispara se o status mudou
  if (antes.status === depois.status) return;
  const novoStatus = depois.status;
  if (novoStatus !== "aprovado" && novoStatus !== "rejeitado") return;

  const db = getFirestore();
  const messaging = getMessaging();

  const uid = depois.uid;
  const userSnap = await db.collection("users").doc(uid).get();
  const user = userSnap.data();
  if (!user || !user.fcmToken) return;

  let title, body;
  if (novoStatus === "aprovado") {
    const valorCPA = depois.valorCPA != null ? Number(depois.valorCPA) : null;
    const valorFmt = valorCPA != null
      ? `R$ ${valorCPA.toLocaleString("pt-BR")}`
      : "";
    title = "✅ CPA Aprovado!";
    body = `Seu CPA${depois.casa ? ` na ${depois.casa}` : ""}${valorFmt ? ` (${valorFmt})` : ""} foi aprovado.`;
  } else {
    title = "❌ CPA Rejeitado";
    const motivo = depois.motivoRejeicao ? ` — ${depois.motivoRejeicao}` : "";
    body = `Seu CPA${depois.casa ? ` na ${depois.casa}` : ""}${motivo} foi rejeitado.`;
  }

  const mensagem = buildMsg(user.fcmToken, title, body);
  await enviarMensagens(messaging, db, [mensagem], [{ id: uid, ...user }]);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
