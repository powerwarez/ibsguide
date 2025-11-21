import { openDB } from "idb";
import { v4 as uuidv4 } from "uuid";

// IndexedDB 설정
const dbPromise = openDB("stocks-database", 3, {
  upgrade(db, oldVersion, newVersion, transaction) {
    if (!db.objectStoreNames.contains("stocks")) {
      db.createObjectStore("stocks", { keyPath: "id" });
    }
    if (oldVersion < 3) {
      const stocksStore = transaction.objectStore("stocks");
      stocksStore.getAll().then((stocks) => {
        stocks.forEach((stock) => {
          if (stock.version === "3.0" && !("compoundInterestRate" in stock)) {
            stock.compoundInterestRate = 0.5;
            stocksStore.put(stock);
          }
        });
      });
    }
    if (!db.objectStoreNames.contains("transactions")) {
      const transactionsStore = db.createObjectStore("transactions", {
        keyPath: "id",
      });
      transactionsStore.createIndex("stockId", "stockId", { unique: false });
    } else if (oldVersion < 2) {
      const transactionStore = db.transaction(
        "transactions",
        "readwrite"
      ).store;
      transactionStore.createIndex("stockId", "stockId", { unique: false });
    }
    if (!db.objectStoreNames.contains("originalInvestment")) {
      db.createObjectStore("originalInvestment", { keyPath: "stockId" });
    }
  },
});

// 운용 종목 저장
export async function saveStock(stock) {
  try {
    const db = await dbPromise;
    const stockWithId = {
      id: uuidv4(),
      quantity: 0,
      averagePrice: 0,
      isSettled: false, // 초기 정산 상태 설정
      splitRatio: 1, // 누적 분할 비율 (기본값 1)
      ...stock,
    };
    await db.add("stocks", stockWithId);
  } catch (error) {
    console.error("Error saving stock:", error);
  }
}

// 모든 운용 종목 가져오기
export async function getStocks() {
  const db = await dbPromise;
  return await db.getAll("stocks");
}

// 특정 stockId로 종목 가져오기
export async function getStockById(stockId) {
  const db = await dbPromise;
  return await db.get("stocks", stockId);
}

// 특정 stockItem의 거래 내역 저장
export async function addTransaction(stockId, transaction) {
  const db = await dbPromise;
  const transactionWithId = {
    id: uuidv4(),
    stockId,
    ...transaction,
  };
  await db.add("transactions", transactionWithId);
}

// 특정 stockId에 해당하는 거래 내역 가져오기
export async function getTransactionsByStockId(stockId) {
  const db = await dbPromise;
  const transactionIndex = db
    .transaction("transactions")
    .store.index("stockId");
  return await transactionIndex.getAll(stockId);
}

// 모든 거래 내역 가져오기
export async function getTransactions() {
  const db = await dbPromise;
  return await db.getAll("transactions");
}

// 운용 종목 삭제 함수
export async function deleteStock(id) {
  const db = await dbPromise;
  await db.delete("stocks", id);

  // 해당 종목과 연결된 모든 거래 내역 삭제
  const transactionStore = db.transaction("transactions", "readwrite").store;
  const transactionIndex = transactionStore.index("stockId");
  const transactionsToDelete = await transactionIndex.getAllKeys(id);
  for (const transactionId of transactionsToDelete) {
    await transactionStore.delete(transactionId);
  }
}

// 특정 거래 내역 삭제
export async function deleteTransaction(id) {
  const db = await dbPromise;
  await db.delete("transactions", id);
}

// 특정 stock 데이터 업데이트
export async function updateStock(stockId, updatedData) {
  const db = await dbPromise;
  const tx = db.transaction("stocks", "readwrite");
  const store = tx.objectStore("stocks");

  const stock = await store.get(stockId);
  if (stock) {
    const updatedStock = { ...stock, ...updatedData };
    await store.put(updatedStock);
  }
  await tx.done;
}

// originalInvestment 저장
export async function saveOriginalInvestment(stockId, data) {
  const db = await dbPromise;
  await db.put("originalInvestment", { stockId, data });
}

// originalInvestment 가져오기
export async function getOriginalInvestment(stockId) {
  const db = await dbPromise;
  return await db.get("originalInvestment", stockId);
}

// 특정 거래 내역 업데이트
export async function updateTransaction(transactionId, updatedData) {
  const db = await dbPromise;
  const tx = db.transaction("transactions", "readwrite");
  const store = tx.objectStore("transactions");

  const transaction = await store.get(transactionId);
  if (transaction) {
    const updatedTransaction = { ...transaction, ...updatedData };
    await store.put(updatedTransaction);
  }
  await tx.done;
}
