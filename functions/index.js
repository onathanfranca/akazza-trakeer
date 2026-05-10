// functions/index.js
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const https = require("https");
const http = require("http");

initializeApp();

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

// ─── Webhook Lowify ───────────────────────────────────────────────────────────
exports.lowifyWebhook = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const payload = req.body;
  const event = payload?.event;
  const saleId = payload?.sale_id;
  const customer = payload?.customer;

  console.log(`Lowify webhook recebido: ${event} — ${saleId}`);

  if (!event || !customer?.email) {
    return res.status(400).json({ error: "Payload inválido" });
  }

  const db = getFirestore();
  const email = customer.email.toLowerCase().trim();
  const nome = customer.name || "Cliente";

  if (event === "sale.paid") {
    try {
      const usersSnap = await db.collection("users").where("email", "==", email).get();

      if (!usersSnap.empty) {
        const user = usersSnap.docs[0].data();
        const tenantId = user.tenantId;
        if (tenantId) {
          await db.collection("tenants").doc(tenantId).update({ plano: "ativo" });
          console.log(`Tenant ${tenantId} reativado para ${email}`);
        }
      } else {
        // Gera tenantId limpo
        const emailPrefix = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase();
        const tenantId = `${emailPrefix}_${Date.now()}`;

        // Cria tenant
        await db.collection("tenants").doc(tenantId).set({
          nome,
          email,
          saleId,
          plano: "ativo",
          adminEmail: email,
          adminNome: nome,
          status: "aguardando_cadastro",
          criadoEm: FieldValue.serverTimestamp(),
        });

        // Cria config padrão
        await db.collection("config").doc(tenantId).set({
          metaDiaria: 50,
          aprovacaoAutomatica: true,
        });

        // Cria Superbet padrão pro novo tenant
const novaCasaId = `superbet_${tenantId}`;
await db.collection("casas").doc(novaCasaId).set({
  nome: "Superbet",
  tenantId,
  valorAdmin: 0,
  custoAdmin: 0,
  valorAfiliado: 0,
  custoAfiliado: 0,
  link: "",
});

        console.log(`Novo tenant criado: ${tenantId} para ${email}`);
      }

      return res.status(200).json({ ok: true, event });
    } catch (e) {
      console.error("Erro ao processar sale.paid:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  if (event === "sale.refund") {
    try {
      const usersSnap = await db.collection("users").where("email", "==", email).get();
      if (!usersSnap.empty) {
        const user = usersSnap.docs[0].data();
        const tenantId = user.tenantId;
        if (tenantId) {
          await db.collection("tenants").doc(tenantId).update({ plano: "inativo" });
          console.log(`Tenant ${tenantId} desativado por refund — ${email}`);
        }
      }
      return res.status(200).json({ ok: true, event });
    } catch (e) {
      console.error("Erro ao processar sale.refund:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  if (event === "sale.pending") {
    console.log(`sale.pending ignorado para ${email}`);
    return res.status(200).json({ ok: true, event, message: "Aguardando pagamento" });
  }

  return res.status(200).json({ ok: true, event: "ignored" });
});

// ─── Notifica novo CPA registrado ────────────────────────────────────────────
exports.notificarNovoCPA = onDocumentCreated("cpas/{cpaId}", async (event) => {
  const cpa = event.data.data();
  if (!cpa) return;

  const db = getFirestore();
  const uid = cpa.uid;
  const casaNome = cpa.casa || "";
  const status = cpa.status || "pendente";
  const tenantId = cpa.tenantId;

  const ownerSnap = await db.collection("users").doc(uid).get();
  const owner = ownerSnap.data();
  if (!owner) return;
  const ownerRole = owner.role || "afiliado";

  let casaData = null;
  if (casaNome) {
    const casaId = casaNome.toLowerCase().replace(/[\s/\\]+/g, "_");
    const casaSnap = await db.collection("casas").doc(casaId).get();
    if (casaSnap.exists) casaData = casaSnap.data();
  }

  const usersSnap = await db.collection("users").where("tenantId", "==", tenantId).get();
  const admins = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === "admin" || u.role === "superadmin");

  const valorAdmin = casaData ? (casaData.valorAdmin ?? casaData.valor ?? 0) : 0;
  const valorAfiliado = casaData ? (casaData.valorAfiliado ?? casaData.valor ?? 0) : 0;
  const valorDeposito = Number(cpa.valorDeposito || 0);
  const nomeAfiliado = (owner.nome || "Afiliado").toUpperCase();

  const pushcutPromises = [];

  if (ownerRole === "admin" || ownerRole === "superadmin") {
    const liquido = valorAdmin - valorDeposito;
    const title = "+1 CPA REGISTRADO ✅";
    const text = liquido > 0 ? `+${fmtBRL(liquido)} pra conta! 💰` : `Casa: ${casaNome || "—"}`;
    if (owner.pushcutUrl) pushcutPromises.push(dispararPushcut(owner.pushcutUrl, title, text));
    await Promise.all(pushcutPromises);
    return;
  }

  if (status === "aprovado") {
    const valorCPA = cpa.valorCPA != null ? Number(cpa.valorCPA) : valorAfiliado;
    const liquidoDono = valorCPA - valorDeposito;
    const margemAdmin = valorAdmin - valorAfiliado;

    const titleDono = "+1 CPA REGISTRADO ✅";
    const textDono = liquidoDono > 0 ? `+${fmtBRL(liquidoDono)} na conta! 💰` : `Casa: ${casaNome || "—"}`;
    if (owner.pushcutUrl) pushcutPromises.push(dispararPushcut(owner.pushcutUrl, titleDono, textDono));

    const titleAdmin = `${nomeAfiliado} REGISTROU CPA ⚡`;
    const textAdmin = margemAdmin > 0 ? `+${fmtBRL(margemAdmin)} pra conta! 💰` : `Casa: ${casaNome || "—"}`;
    for (const admin of admins) {
      if (admin.pushcutUrl) pushcutPromises.push(dispararPushcut(admin.pushcutUrl, titleAdmin, textAdmin));
    }

    await Promise.all(pushcutPromises);
    return;
  }

  const titlePendente = `${nomeAfiliado} REGISTROU CPA ⏳`;
  const textPendente = `⏳ Aguardando aprovação — Casa: ${casaNome || "—"}`;
  for (const admin of admins) {
    if (admin.pushcutUrl) pushcutPromises.push(dispararPushcut(admin.pushcutUrl, titlePendente, textPendente));
  }
  await Promise.all(pushcutPromises);
});

// ─── Notifica mudança de status ───────────────────────────────────────────────
exports.notificarStatusCPA = onDocumentUpdated("cpas/{cpaId}", async (event) => {
  const antes = event.data.before.data();
  const depois = event.data.after.data();
  if (!antes || !depois) return;
  if (antes.status === depois.status) return;

  const novoStatus = depois.status;
  if (novoStatus !== "aprovado" && novoStatus !== "rejeitado") return;
  if (antes.status !== "pendente") return;

  const db = getFirestore();
  const uid = depois.uid;
  const casaNome = depois.casa || "";
  const tenantId = depois.tenantId;

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

  const usersSnap = await db.collection("users").where("tenantId", "==", tenantId).get();
  const admins = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === "admin" || u.role === "superadmin");

  const valorAdmin = casaData ? (casaData.valorAdmin ?? casaData.valor ?? 0) : 0;
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

    if (user.pushcutUrl) pushcutPromises.push(dispararPushcut(user.pushcutUrl, titleDono, textDono));
    for (const admin of admins) {
      if (admin.pushcutUrl) pushcutPromises.push(dispararPushcut(admin.pushcutUrl, titleAdmin, textAdmin));
    }
  } else {
    const motivo = depois.motivoRejeicao ? ` — ${depois.motivoRejeicao}` : "";
    const titleDono = "CPA REJEITADO ❌";
    const textDono = `Casa: ${casaNome || "—"}${motivo} 😔`;
    const titleAdmin = "CPA REJEITADO ❌";
    const textAdmin = `${nomeAfiliado} • Casa: ${casaNome || "—"}${motivo}`;

    if (user.pushcutUrl) pushcutPromises.push(dispararPushcut(user.pushcutUrl, titleDono, textDono));
    for (const admin of admins) {
      if (admin.pushcutUrl) pushcutPromises.push(dispararPushcut(admin.pushcutUrl, titleAdmin, textAdmin));
    }
  }

  await Promise.all(pushcutPromises);
});