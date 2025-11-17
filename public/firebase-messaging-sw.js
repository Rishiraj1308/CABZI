// /public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.11.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.11.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB8bFxF6fILR4myxGUCN9IR9Qis9ljADMA",
  authDomain: "cabzi-welr1.firebaseapp.com",
  projectId: "cabzi-welr1",
  storageBucket: "cabzi-welr1.appspot.com",
  messagingSenderId: "786266287419",
  appId: "1:786266287419:web:4ad396cbd949ba46695b1e"
});

const messaging = firebase.messaging();
