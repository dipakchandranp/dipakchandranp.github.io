export const firebaseConfig = {
  apiKey: "AIzaSyD6QWvfyJsNuZdGV2X0DXtwhvQtTkzSqvI",
  authDomain: "zelozuno-zelozuno.firebaseapp.com",
  projectId: "zelozuno-zelozuno",
  storageBucket: "zelozuno-zelozuno.firebasestorage.app",
  messagingSenderId: "260192817705",
  appId: "1:260192817705:web:8e9a05798522586161c238"
};
// Score Worker: all score/leaderboard/username writes go through it (clients cannot write them in Firestore).
export const workerUrl = "https://zz-scores.zelozuno.workers.dev";
