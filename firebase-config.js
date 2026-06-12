import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC9CZ8N7LOm9MYaVdUJk5UcGykwy7bXi3I",
  authDomain: "memorabet-77fea.firebaseapp.com",
  databaseURL: "https://memorabet-77fea-default-rtdb.firebaseio.com",
  projectId: "memorabet-77fea",
  storageBucket: "memorabet-77fea.firebasestorage.app",
  messagingSenderId: "39967822156",
  appId: "1:39967822156:web:2e9c312ee2e9f80df73fe9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
