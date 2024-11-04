import { openDB } from 'idb';
import { v4 as uuidv4 } from 'uuid';

// IndexedDB 설정
const dbPromise = openDB('stocks-database', 2, { // 버전을 2로 설정하여 업그레이드 트리거
  upgrade(db, oldVersion) {
    // stocks 스토어 생성
    if (!db.objectStoreNames.contains('stocks')) {
      db.createObjectStore('stocks', { keyPath: 'id' });
    }
    // transactions 스토어 생성 및 인덱스 설정
    if (!db.objectStoreNames.contains('transactions')) {
      const store = db.createObjectStore('transactions', { keyPath: 'id' });
      store.createIndex('stockId', 'stockId', { unique: false }); // stockId 인덱스 생성
    } else if (oldVersion < 2) {
      // 기존 transactions 스토어에 stockId 인덱스를 추가
      const transactionStore = db.transaction('transactions', 'readwrite').store;
      transactionStore.createIndex('stockId', 'stockId', { unique: false });
    }
  },
});

// 운용 종목 저장
export async function saveStock(stock) {
  const db = await dbPromise;
  const stockWithId = {
    id: uuidv4(),
    quantity: 0,
    averagePrice: 0,
    ...stock,
  };
  await db.add('stocks', stockWithId);
}

// 모든 운용 종목 가져오기
export async function getStocks() {
  const db = await dbPromise;
  return await db.getAll('stocks');
}

// 특정 stockItem의 거래 내역 저장
export async function addTransaction(stockId, transaction) {
  const db = await dbPromise;
  const transactionWithId = {
    id: uuidv4(),
    stockId, // stockId로 종목과 연결
    ...transaction,
  };
  await db.add('transactions', transactionWithId);
}

// 특정 stockId에 해당하는 거래 내역 가져오기
export async function getTransactionsByStockId(stockId) {
  const db = await dbPromise;
  const transactionIndex = db.transaction('transactions').store.index('stockId');
  return await transactionIndex.getAll(stockId);
}

// 모든 거래 내역 가져오기
export async function getTransactions() {
  const db = await dbPromise;
  return await db.getAll('transactions');
}

// 운용 종목 삭제 함수
export async function deleteStock(id) {
  const db = await dbPromise;
  await db.delete('stocks', id);

  // 해당 종목과 연결된 모든 거래 내역도 삭제
  const transactionIndex = db.transaction('transactions').store.index('stockId');
  const transactionsToDelete = await transactionIndex.getAllKeys(id);
  for (const transactionId of transactionsToDelete) {
    await db.delete('transactions', transactionId);
  }
}

// 특정 거래 내역 삭제
export async function deleteTransaction(id) {
  const db = await dbPromise;
  await db.delete('transactions', id);
}