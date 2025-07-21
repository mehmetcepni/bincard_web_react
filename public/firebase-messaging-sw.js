importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "BLwx7Rv-ij0ITL560moydVbTO87EAlefJS7F8hKBVkYIf9ul-wqsbIkD-qLJrXufCGvL9wR0TT5eMBZQv7l7WMY",
  authDomain: "bincard-9a335.firebaseapp.com",
  projectId: "bincard-9a335",
  storageBucket: "bincard-9a335.appspot.com",
  messagingSenderId: "780893318254",
  appId: "1:780893318254:web:dd5eeedd271eea69dc8a7f",
  measurementId: "G-Y9KL38F97Z"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg',
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/') // Burayı istediğiniz bir URL ile değiştirebilirsiniz
  );
}); 