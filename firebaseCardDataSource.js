import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// リモートデータソース: Firestore を使ってカードを管理する層
export class FirebaseCardDataSource {
  constructor(dbCloud) {
    this.dbCloud = dbCloud;
  }

  // Firestore にカードを追加
  async addCard(uid, card) {
    const cardData = {
      uid,
      q: card.q,
      a: card.a,
      learned: card.learned,
      reviewCount: card.reviewCount,
      nextReview: card.nextReview,
      updatedAt: new Date()
    };

    return await addDoc(collection(this.dbCloud, "cards"), cardData);
  }

  // Firestore 上のカードを更新
  async updateCard(firebaseId, data) {
    if (!firebaseId) return;
    const cardRef = doc(this.dbCloud, "cards", firebaseId);
    await updateDoc(cardRef, {
      ...data,
      updatedAt: new Date()
    });
  }

  // Firestore 上のカードを削除
  async deleteCard(firebaseId) {
    if (!firebaseId) return;
    await deleteDoc(doc(this.dbCloud, "cards", firebaseId));
  }

  // 指定ユーザーのカードを Firestore から取得
  async fetchCards(uid) {
    const q = query(
      collection(this.dbCloud, "cards"),
      where("uid", "==", uid)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      firebaseId: docSnap.id
    }));
  }
}
