// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCHV0uvoPsgUbGBb9tAnYqLtT6KL89tWKQ",
  authDomain: "akazzatracker.firebaseapp.com",
  projectId: "akazzatracker",
  storageBucket: "akazzatracker.firebasestorage.app",
  messagingSenderId: "743896201323",
  appId: "1:743896201323:web:5be570908f15997b74192e"
});

const messaging = firebase.messaging();

// Notificação em segundo plano (app fechado/minimizado)
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    tag: 'cpa-notification',
    renotify: true,
  });
});
