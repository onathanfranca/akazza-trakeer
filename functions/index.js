// functions/index.js
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.notificarNovoCPA = onDocumentCreated("cpas/{cpaId}", async (event) => {
  const cpa = event.data.data();
  if (!cpa) return;

  const db = getFirestore();
  const messaging = getMessaging();

  const casaNome = cpa.casa || "";
  const uid = cpa.uid; // quem registrou o CPA

  // Busca dados do usuário que registrou
  const ownerSnap = await db.collection("users").doc(uid).get();
  const owner = ownerSnap.data();
  if (!owner) return;

  const ownerRole = owner.role || "afiliado";
  const ownerNome = owner.nome || "Afiliado";

  // Busca dados da casa para pegar o valor correto
  let valorCPA = null;
  if (casaNome) {
    const casaId = casaNome.toLowerCase().replace(/[\s/\\]+/g, "_");
    const casaSnap = await db.collection("casas").doc(casaId).get();
    if (casaSnap.exists) {
      const casaData = casaSnap.data();
      // Valor baseado no role de quem registrou
      if (ownerRole === "admin") {
        valorCPA = casaData.valorAdmin ?? casaData.valor ?? null;
      } else {
        valorCPA = casaData.valorAfiliado ?? casaData.valor ?? null;
      }
    }
  }

  // Formata o valor
  const valorFmt = valorCPA != null
    ? `+R$ ${Number(valorCPA).toLocaleString("pt-BR")}`
    : "+1 CPA";

  const title = "Novo CPA 💰";
  const body = valorFmt;

  // Busca todos os usuários com token FCM
  const usersSnap = await db.collection("users").get();
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const mensagens = [];

  for (const user of users) {
    if (!user.fcmToken) continue;

    const isAdmin = user.role === "admin";
    const isOwner = user.id === uid || user.uid === uid;

    // Regras:
    // - Admin registrou → só admins recebem
    // - Afiliado registrou → afiliado + todos os admins recebem
    if (ownerRole === "admin" && !isAdmin) continue;
    if (ownerRole !== "admin" && !isOwner && !isAdmin) continue;

    mensagens.push({
      token: user.fcmToken,
      notification: { title, body },
      android: {
        notification: {
          title,
          body,
          sound: "default",
          channelId: "cpa_channel",
          priority: "high",
        },
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: "default",
            badge: 1,
          },
        },
      },
      webpush: {
        notification: {
          title,
          body,
          icon: "/logo192.png",
          badge: "/logo192.png",
          vibrate: [200, 100, 200],
        },
        fcmOptions: { link: "/" },
      },
    });
  }

  if (mensagens.length === 0) {
    console.log("Nenhum token FCM encontrado.");
    return;
  }

  const results = await messaging.sendEach(mensagens);
  console.log(`Enviadas: ${results.successCount} sucesso, ${results.failureCount} falha`);

  // Remove tokens inválidos do Firestore
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
});
