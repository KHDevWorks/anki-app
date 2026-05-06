// ユースケース層: アプリケーションの振る舞いを定義し、UI から呼び出し可能にする
export function createCardUseCases(cardRepository) {
  return {
    addCard: async (card, uid) => cardRepository.addCard(card, uid),
    getAllCards: async (uid) => cardRepository.getAllCards(uid),
    updateCard: async (localId, data) => cardRepository.updateCard(localId, data),
    deleteCard: async (localId) => cardRepository.deleteCard(localId),
    syncCards: async (uid) => cardRepository.syncCards(uid)
  };
}
