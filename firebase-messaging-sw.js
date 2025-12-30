importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDcRF7nPTEsUYalz_mG4uqMaj978gF6yu4",
  authDomain: "bafira-notifikasi.firebaseapp.com",
  projectId: "bafira-notifikasi",
  storageBucket: "bafira-notifikasi.firebasestorage.app",
  messagingSenderId: "67628509348",
  appId: "1:67628509348:web:35090a2df41b07d5dd9e31"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
      icon: "/icon-192.png"
    }
  );
});