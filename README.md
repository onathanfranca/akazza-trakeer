# ⚡ AKAZZA TRACKER — Versão Firebase

Sistema de rastreamento de CPAs com autenticação, banco de dados em tempo real e painel admin.

---

## 🔧 SETUP — Passo a Passo

### 1. Instalar dependências

```bash
npm install
```

---

### 2. Configurar o Firebase

Abra o arquivo `src/firebase/config.js` e substitua com os dados do **seu** projeto Firebase:

```js
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};
```

> Acesse: [Firebase Console](https://console.firebase.google.com) → Seu projeto → ⚙️ Configurações → Seus apps → SDK de configuração

---

### 3. Ativar serviços no Firebase Console

#### Authentication
- Vá em **Authentication → Sign-in method**
- Ative **E-mail/senha**

#### Firestore Database
- Vá em **Firestore Database → Criar banco de dados**
- Escolha **Modo de produção** (ou teste para desenvolvimento)
- Coloque as **regras de segurança** abaixo

#### Realtime Database
- Vá em **Realtime Database → Criar banco de dados**
- Escolha a região (geralmente `us-central1`)
- Comece em modo bloqueado (as regras abaixo liberam o acesso)

---

### 4. Regras do Firestore

No **Firestore → Regras**, cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Usuários: lê o próprio perfil, admin lê todos
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // CPAs: afiliado manipula os próprios, admin lê todos
    match /cpas/{docId} {
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow read, update, delete: if request.auth.uid == resource.data.uid;
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Casas e Config: somente admin escreve, todos leem (autenticados)
    match /casas/{docId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /config/{docId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

### 5. Criar o primeiro admin

Depois de criar a primeira conta pelo app, vá no **Firestore → users → [seu UID]** e mude o campo `role` de `"afiliado"` para `"admin"` manualmente.

A partir daí, você pode promover outros usuários pelo painel de Gerenciar.

---

### 6. Rodar o projeto

```bash
npm start
```

Acessa em `http://localhost:3000`

---

### 7. Build para produção

```bash
npm run build
```

A pasta `build/` gerada pode ser publicada no **Firebase Hosting**, Vercel, Netlify, etc.

#### Firebase Hosting (opcional):
```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # escolha a pasta build/
firebase deploy
```

---

## 📁 Estrutura do Projeto

```
src/
├── firebase/
│   └── config.js          ← suas credenciais Firebase
├── context/
│   ├── AuthContext.js     ← autenticação + perfil do usuário
│   └── ToastContext.js    ← notificações globais
├── hooks/
│   ├── useCPAs.js         ← CPAs do usuário logado (realtime)
│   ├── useAllCPAs.js      ← todos os CPAs — admin (realtime)
│   └── useAdmin.js        ← useUsers, useCasas, useConfig
├── pages/
│   ├── AuthPage.js        ← login / cadastro
│   ├── MeuPainel.js       ← painel do afiliado
│   ├── AdminPainel.js     ← painel geral admin
│   ├── Ranking.js         ← ranking de afiliados
│   ├── Gerenciar.js       ← gestão de usuários e casas
│   └── Config.js          ← meta diária
├── styles/
│   └── global.css         ← todo o CSS do app
├── App.js                 ← layout principal + rotas
└── index.js               ← entrypoint React
```

---

## 🗄️ Estrutura do Firestore

```
users/
  {uid}/
    nome, email, role ("admin" | "afiliado"), createdAt

cpas/
  {docId}/
    uid, casa, player, createdAt

casas/
  {id}/
    nome, valor, custo

config/
  geral/
    metaDiaria
```

---

## ✅ Funcionalidades

- 🔐 Login / Cadastro com Firebase Auth
- 👤 Roles: admin e afiliado
- 📊 Painel Admin com visão geral de todos os afiliados
- 🏠 Painel individual por afiliado
- 🏆 Ranking em tempo real
- 👥 Gerenciar usuários (promover/remover)
- 🏠 Gerenciar casas de aposta (valor e custo por CPA)
- ⚙️ Meta diária configurável
- 🌙 Toggle dark/light mode
- ⚡ Dados em tempo real via Firestore onSnapshot
- 📅 Filtro por período de datas
- 🔔 Notificações toast
