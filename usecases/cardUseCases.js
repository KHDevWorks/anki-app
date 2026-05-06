// usecases/cardUseCases.js

// ユースケース層: アプリケーションの振る舞いを定義し、UI から呼び出し可能にする
export function createCardUseCases(cardRepository) {
  return {
    addCard: async (uid, card) => cardRepository.addCard(card, uid),
    getAllCards: async (uid) => cardRepository.getAllCards(uid),
    updateCard: async (uid, localId, data) =>
      cardRepository.updateCard(localId, data),
    deleteCard: async (uid, localId) =>
      cardRepository.deleteCard(localId),

    syncCards: async (uid) => cardRepository.syncCards(uid),
    syncToRemote: async (uid) => cardRepository.syncToRemote(uid),

    exportJson: async (uid) => {
      const cards = await cardRepository.getAllCards(uid);
      return JSON.stringify(cards, null, 2);
    },

    importJson: async (uid, jsonText) => {
      const cards = JSON.parse(jsonText);
      await cardRepository.clearLocal(uid);

      for (const c of cards) {
        await cardRepository.addCard(c, uid);
      }
    },

    getLearningCards: async (uid) => {
      const cards = await cardRepository.getAllCards(uid);
      return cards.sort(() => Math.random() - 0.5);
    }
  };
}
