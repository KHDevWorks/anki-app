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
// 🔑 Firebase設定（ここだけ自分のに変える）
const firebaseConfig = {
  apiKey:"AIzaSyBmxW9vgmKcaqdsc1qrhG80t13BQzFrUro", 
  authDomain:"my-anki-app-be46b.firebaseapp.com",
  projectId: "my-anki-app-be46b",
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

// -------------------------
// パスワードバリデーション
// -------------------------
function validatePassword(password) {
  if (password.length < 8) return "8文字以上にしてください";
  if (!/[A-Z]/.test(password)) return "大文字を含めてください";
  if (!/[a-z]/.test(password)) return "小文字を含めてください";
  if (!/[0-9]/.test(password)) return "数字を含めてください";
  return null;
}

// -------------------------
// DOM取得
// -------------------------
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const message = document.getElementById("message");
const appDiv = document.getElementById("anki-app");

// -------------------------
// 登録
// -------------------------
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
    message.textContent = e.message;
  }
};

// -------------------------
// ログイン
// -------------------------
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

// -------------------------
// ログアウト
// -------------------------
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
};

// -------------------------
// 認証状態監視（最重要）
// -------------------------

// -------------------------
onAuthStateChanged(auth, (user) => {
  if (user) {
    message.textContent = "ログイン中: " + user.email;
    appDiv.style.display = "block";
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

window.auth = auth;

// ローカル DB からカードを読み出して画面を更新する関数
async function refreshCards() {
  const user = auth.currentUser;
  if (!user) return;

  await dbReady;
  const cards = await cardUseCases.getAllCards(user.uid);
  console.log("refreshCards", cards);
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await window.syncFromFirebase();
    await refreshCards();
  }
});