// Firebase App (the core Firebase SDK) is always required and must be listed first
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "BLwx7Rv-ij0ITL560moydVbTO87EAlefJS7F8hKBVkYIf9ul-wqsbIkD-qLJrXufCGvL9wR0TT5eMBZQv7l7WMY",
  authDomain: "bincard-9a335.firebaseapp.com",
  projectId: "bincard-9a335",
  storageBucket: "bincard-9a335.appspot.com",
  messagingSenderId: "780893318254",
  appId: "1:780893318254:web:dd5eeedd271eea69dc8a7f",
  measurementId: "G-Y9KL38F97Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Messaging
let messaging;
try {
  messaging = getMessaging(app);
} catch (e) {
  messaging = null;
}

export { app, messaging, getToken, onMessage }; 