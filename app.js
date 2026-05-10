// app.js

// Firebase CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { DexieLocalCardDataSource, CardRepository } from "./db.js";
import { FirebaseCardDataSource } from "./firebaseCardDataSource.js";
import { createCardUseCases } from "./usecases/cardUseCases.js";

// アプリ層: UI とユースケース / リポジトリの橋渡し
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const dbCloud = getFirestore(app);

const localDataSource = new DexieLocalCardDataSource();
const remoteDataSource = new FirebaseCardDataSource(dbCloud);
const cardRepository = new CardRepository(localDataSource, remoteDataSource);
const cardUseCases = createCardUseCases(cardRepository);

// 初期化: ローカル IndexedDB をセットアップ
const dbReady = (async () => {
  cardRepository.init();
})();

// パスワードバリデーション
function validatePassword(password) {
  if (password.length < 8) return "8文字以上にしてください";
  if (!/[A-Z]/.test(password)) return "大文字を含めてください";
  if (!/[a-z]/.test(password)) return "小文字を含めてください";
  if (!/[0-9]/.test(password)) return "数字を含めてください";
  return null;
}

// DOM取得
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const message = document.getElementById("message");
const appDiv = document.getElementById("anki-app");

// 登録
document.getElementById("registerBtn").onclick = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  const error = validatePassword(password);
  if (error) {
    message.textContent = error;
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    message.textContent = "登録成功";
  } catch (e) {
    if (e.code === "auth/configuration-not-found") {
      message.textContent =
        "Firebase 設定が不正です。Firebase コンソールでプロジェクトの認証設定と localhost の許可ドメインを確認してください。";
    } else {
      message.textContent = e.message;
    }
  }
};

// ログイン
document.getElementById("loginBtn").onclick = async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      emailInput.value,
      passwordInput.value
    );
    message.textContent = "ログイン成功";
  } catch (e) {
    message.textContent = e.message;
  }
};

// ログアウト
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
};

// 認証状態監視（UI表示および初期データ同期）
onAuthStateChanged(auth, async (user) => {
  if (user) {
    message.textContent = "ログイン中: " + user.email;
    appDiv.style.display = "block";
    await window.syncFromFirebase();
    await refreshCards();
  } else {
    message.textContent = "未ログイン";
    appDiv.style.display = "none";
  }
});

// Firebase から同期してローカル DB を更新するユースケース
window.syncFromFirebase = async function () {
  const user = auth.currentUser;
  if (!user) return;

  await dbReady;
  return await cardUseCases.syncCards(user.uid);
};

window.syncToFirebase = async function () {
  const user = auth.currentUser;
  if (!user) return;

  await dbReady;
  await cardUseCases.syncToRemote(user.uid);
  alert("Firebase に同期しました");
};

window.auth = auth;

// ローカル DB からカードを読み出して画面を更新する関数
async function refreshCards() {
  const user = auth.currentUser;
  if (!user) return;

  await dbReady;
  const cards = await cardUseCases.getAllCards(user.uid);

  const list = document.getElementById("cardList");
  if (!list) return;

  list.innerHTML = cards
    .map(
      (c) => `
      <div class="card">
        <p><strong>Q:</strong> ${c.q}</p>
        <p><strong>A:</strong> ${c.a}</p>
        <button onclick="window.editCard(${c.id})">編集</button>
        <button onclick="window.deleteCard(${c.id})">削除</button>
      </div>
    `
    )
    .join("");
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await window.syncFromFirebase();
    await refreshCards();
  }
});

window.syncToFirebase = async function () {
  const user = auth.currentUser;
  if (!user) return;

  await dbReady;
  await cardUseCases.syncToRemote(user.uid);
  alert("Firebase に同期しました");
};

// 問題作成
window.createCard = async function () {
  const user = auth.currentUser;
  if (!user) return;

  const qEl = document.getElementById("question");
  const aEl = document.getElementById("answer");
  if (!qEl || !aEl) return;

  const q = qEl.value;
  const a = aEl.value;
  if (!q || !a) {
    alert("問題文と答えを入力してください");
    return;
  }

  await dbReady;
  await cardUseCases.addCard(user.uid, {
    q,
    a,
    learned: false,
    reviewCount: 0,
    nextReview: null
  });

  alert("保存しました");
  qEl.value = "";
  aEl.value = "";
  await refreshCards();
};

// 問題編集
window.editCard = async function (id) {
  const user = auth.currentUser;
  if (!user) return;

  await dbReady;
  const cards = await cardUseCases.getAllCards(user.uid);
  const card = cards.find((c) => c.id === id);
  if (!card) return;

  const q = prompt("問題文を編集", card.q);
  const a = prompt("答えを編集", card.a);
  if (!q || !a) return;

  await cardUseCases.updateCard(user.uid, id, { q, a });
  await refreshCards();
};

// 問題削除
window.deleteCard = async function (id) {
  const user = auth.currentUser;
  if (!user) return;
  if (!confirm("この問題を削除しますか？")) return;

  await dbReady;
  await cardUseCases.deleteCard(user.uid, id);
  await refreshCards();
};

// JSON エクスポート
window.exportJson = async function () {
  const user = auth.currentUser;
  if (!user) return;

  await dbReady;
  const json = await cardUseCases.exportJson(user.uid);

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cards.json";
  a.click();
  URL.revokeObjectURL(url);
};

// JSON インポート
window.importJson = async function () {
  const user = auth.currentUser;
  if (!user) return;

  const input = document.getElementById("importFile");
  if (!input || !input.files[0]) {
    alert("JSON ファイルを選択してください");
    return;
  }

  const text = await input.files[0].text();

  await dbReady;
  await cardUseCases.importJson(user.uid, text);
  await refreshCards();
  alert("インポートしました");
};

// 学習モード
window.startLearning = async function () {
  const user = auth.currentUser;
  if (!user) return;

  await dbReady;
  const cards = await cardUseCases.getLearningCards(user.uid);
  if (!cards.length) {
    alert("問題がありません。先に作成してください。");
    return;
  }

  let index = 0;

  const qView = document.getElementById("questionView");
  const aView = document.getElementById("answerView");
  const showBtn = document.getElementById("showAnswerBtn");
  const nextBtn = document.getElementById("nextBtn");

  function showCard() {
    const card = cards[index];
    qView.textContent = card.q;
    aView.textContent = "";
  }

  function showAnswer() {
    aView.textContent = cards[index].a;
  }

  function nextCard() {
    index = (index + 1) % cards.length;
    showCard();
  }

  showBtn.onclick = showAnswer;
  nextBtn.onclick = nextCard;

  showCard();
};

// 問題作成
window.createCard = async function () {
  const user = auth.currentUser;
  if (!user) return;

  const qEl = document.getElementById("question");
  const aEl = document.getElementById("answer");
  if (!qEl || !aEl) return;

  const q = qEl.value;
  const a = aEl.value;
  if (!q || !a) {
    alert("問題文と答えを入力してください");
    return;
  }

  await dbReady;
  await cardUseCases.addCard(user.uid, {
    q,
    a,
    learned: false,
    reviewCount: 0,
    nextReview: null
  });

  alert("保存しました");
  qEl.value = "";
  aEl.value = "";
  await refreshCards();
};

// 問題編集
window.editCard = async function (id) {
  const user = auth.currentUser;
  if (!user) return;

  await dbReady;
  const cards = await cardUseCases.getAllCards(user.uid);
  const card = cards.find((c) => c.id === id);
  if (!card) return;

  const q = prompt("問題文を編集", card.q);
  const a = prompt("答えを編集", card.a);
  if (!q || !a) return;

  await cardUseCases.updateCard(user.uid, id, { q, a });
  await refreshCards();
};

// 問題削除
window.deleteCard = async function (id) {
  const user = auth.currentUser;
  if (!user) return;
  if (!confirm("この問題を削除しますか？")) return;

  await dbReady;
  await cardUseCases.deleteCard(user.uid, id);
  await refreshCards();
};

// JSON エクスポート
window.exportJson = async function () {
  const user = auth.currentUser;
  if (!user) return;

  await dbReady;
  const json = await cardUseCases.exportJson(user.uid);

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cards.json";
  a.click();
  URL.revokeObjectURL(url);
};

// JSON インポート
window.importJson = async function () {
  const user = auth.currentUser;
  if (!user) return;

  const input = document.getElementById("importFile");
  if (!input || !input.files[0]) {
    alert("JSON ファイルを選択してください");
    return;
  }

  const text = await input.files[0].text();

  await dbReady;
  await cardUseCases.importJson(user.uid, text);
  await refreshCards();
  alert("インポートしました");
};

// 学習モード
window.startLearning = async function () {
  const user = auth.currentUser;
  if (!user) return;

  await dbReady;
  const cards = await cardUseCases.getLearningCards(user.uid);
  if (!cards.length) {
    alert("問題がありません。先に作成してください。");
    return;
  }

  let index = 0;

  const qView = document.getElementById("questionView");
  const aView = document.getElementById("answerView");
  const showBtn = document.getElementById("showAnswerBtn");
  const nextBtn = document.getElementById("nextBtn");

  function showCard() {
    const card = cards[index];
    qView.textContent = card.q;
    aView.textContent = "";
  }

  function showAnswer() {
    aView.textContent = cards[index].a;
  }

  function nextCard() {
    index = (index + 1) % cards.length;
    showCard();
  }

  showBtn.onclick = showAnswer;
  nextBtn.onclick = nextCard;

  showCard();
};
