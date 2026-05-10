const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://akazzatracker-default-rtdb.firebaseio.com'
});

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const tenantId = 'akazza-master';
const collections = ['cpas', 'casas', 'fechamentos', 'config'];

async function migrate() {
  console.log('Conectando ao Firestore...');
  
  for (const col of collections) {
    const snap = await db.collection(col).get();
    console.log(`\n📂 ${col}: ${snap.docs.length} documentos`);
    
    for (const doc of snap.docs) {
      if (!doc.data().tenantId) {
        await doc.ref.update({ tenantId });
        console.log(`  ✅ ${doc.id}`);
      } else {
        console.log(`  ⏭️ ${doc.id} já tem tenantId`);
      }
    }
  }
  console.log('\n🎉 Migração concluída!');
}

migrate().catch(console.error);