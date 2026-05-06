// db.js

// ローカルデータソース: IndexedDB を使ってカードを永続化する層
export class DexieLocalCardDataSource {
  constructor(dbName = "CardDB") {
    this.dbName = dbName;
    this.db = null;
  }

  // IndexedDB の初期化を一度だけ実行
  init() {
    if (this.db) return;
    if (typeof Dexie === "undefined") {
      throw new Error("Dexie is not loaded.");
    }

    this.db = new Dexie(this.dbName);
    this.db.version(1).stores({
      cards: "++id, uid, q, a, learned, reviewCount, nextReview, firebaseId"
    });
  }

  // 新規カードをローカル DB に追加
  async addCard(card) {
    return await this.db.cards.add(card);
  }

  // 指定ユーザーのカード一覧を取得
  async getCardsByUid(uid) {
    return await this.db.cards.where("uid").equals(uid).toArray();
  }

  // ローカルカードを ID で取得
  async getCard(id) {
    return await this.db.cards.get(id);
  }

  // ローカルカードを更新
  async updateCard(id, data) {
    return await this.db.cards.update(id, data);
  }

  // ローカルカードを削除
  async deleteCard(id) {
    return await this.db.cards.delete(id);
  }

  // 一括追加: 同期時に使用
  async bulkAdd(cards) {
    return await this.db.cards.bulkAdd(cards);
  }

  // ローカル DB を全削除
  async clear() {
    return await this.db.cards.clear();
  }
}

// リポジトリ層: ローカル / リモートを統合し、ユースケースに提供する
export class CardRepository {
  constructor(localDataSource, remoteDataSource) {
    this.localDataSource = localDataSource;
    this.remoteDataSource = remoteDataSource;
  }

  // ローカルデータソースを初期化
  init() {
    this.localDataSource.init();
  }

  // カードを追加: 先にリモートへ、次にローカルへ保存
  async addCard(card, uid) {
    const cardToSave = { ...card, uid };
    const docRef = await this.remoteDataSource.addCard(uid, cardToSave);

    if (docRef?.id) {
      cardToSave.firebaseId = docRef.id;
    }

    return await this.localDataSource.addCard(cardToSave);
  }

  // ローカル DB から全カードを取得
  async getAllCards(uid) {
    return await this.localDataSource.getCardsByUid(uid);
  }

  // ローカルおよびリモートのカードを更新
  async updateCard(localId, data) {
    const card = await this.localDataSource.getCard(localId);
    if (!card) return null;

    await this.localDataSource.updateCard(localId, data);

    if (card.firebaseId) {
      await this.remoteDataSource.updateCard(card.firebaseId, data);
    }

    return await this.localDataSource.getCard(localId);
  }

  // カードを削除: 先にリモート、次にローカル
  async deleteCard(localId) {
    const card = await this.localDataSource.getCard(localId);
    if (!card) return null;

    if (card.firebaseId) {
      await this.remoteDataSource.deleteCard(card.firebaseId);
    }

    return await this.localDataSource.deleteCard(localId);
  }

  // リモートからカードを取得し、ローカル DB を同期
  async syncCards(uid) {
    const remoteCards = await this.remoteDataSource.fetchCards(uid);
    await this.localDataSource.clear();

    const cardsToStore = remoteCards.map((card) => ({
      ...card,
      uid
    }));

    return await this.localDataSource.bulkAdd(cardsToStore);
  }

  // ローカル DB を全削除（JSON インポート用）
  async clearLocal() {
    return await this.localDataSource.clear();
  }

  // ローカル → Firebase 同期
  async syncToRemote(uid) {
    const localCards = await this.localDataSource.getCardsByUid(uid);

    for (const card of localCards) {
      if (!card.firebaseId) {
        const docRef = await this.remoteDataSource.addCard(uid, card);
        if (docRef?.id) {
          await this.localDataSource.updateCard(card.id, {
            firebaseId: docRef.id
          });
        }
      } else {
        await this.remoteDataSource.updateCard(card.firebaseId, card);
      }
    }

    return true;
  }
}
