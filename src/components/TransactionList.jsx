import React, { useState, useEffect, useCallback } from 'react';
import { addTransaction, getTransactionsByStockId } from '../db';

const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const TransactionList = ({ stockId, onAddTransaction }) => {
  const [transactions, setTransactions] = useState([]);
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [transactionInput, setTransactionInput] = useState({
    date: new Date().toISOString().slice(0, 10),
    price: '',
    quantity: '',
    fee: '',
  });

  const loadTransactions = useCallback(async () => {
    const storedTransactions = await getTransactionsByStockId(stockId);
    const sortedTransactions = storedTransactions.sort((a, b) => b.timestamp - a.timestamp);
    setTransactions(sortedTransactions);
  }, [stockId]); // stockId가 변경될 때만 함수가 다시 생성됨

  // 초기 로드
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // 매수, 매도 입력 처리
  const handleTransactionSubmit = async (type) => {
    try {
      const newQuantity = type === '매도' ? -Math.abs(transactionInput.quantity) : parseInt(transactionInput.quantity, 10);
      const newTransaction = {
        ...transactionInput,
        id: generateUniqueId(), // timestamp 대신 고유 ID 사용
        quantity: newQuantity,
        type,
        timestamp: Date.now(),
        stockId
      };

      // IndexedDB에 거래 내역 저장
      await addTransaction(stockId, newTransaction);
      
      // 낙관적 업데이트: UI를 즉시 업데이트
      setTransactions(prevTransactions => [newTransaction, ...prevTransactions]);

      // 입력 폼 초기화
      setTransactionInput({
        date: new Date().toISOString().slice(0, 10),
        price: '',
        quantity: '',
        fee: ''
      });
      setIsBuying(false);
      setIsSelling(false);

      // DB에서 다시 로드하여 데이터 동기화
      await loadTransactions();

      // 부모 컴포넌트에 새로운 거래 전달
      onAddTransaction(newTransaction);
    } catch (error) {
      console.error('거래 추가 중 오류 발생:', error);
      // 에러 발생 시 다시 로드하여 상태 복구
      await loadTransactions();
    }
  };

  const handleCancel = () => {
    setTransactionInput({
      date: new Date().toISOString().slice(0, 10),
      price: '',
      quantity: '',
      fee: ''
    });
    setIsBuying(false);
    setIsSelling(false);
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow-lg mt-6">
      {/* 거래 입력 폼 (매수/매도) */}
      {(isBuying || isSelling) && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">{isBuying ? '매수 입력' : '매도 입력'}</h3>
          <div className="space-y-4">
            <div>
              <label className="block">날짜:</label>
              <input
                type="date"
                value={transactionInput.date}
                onChange={(e) => setTransactionInput({ ...transactionInput, date: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block">체결가:</label>
              <input
                type="number"
                value={transactionInput.price}
                onChange={(e) => setTransactionInput({ ...transactionInput, price: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block">수량:</label>
              <input
                type="number"
                value={transactionInput.quantity}
                onChange={(e) => setTransactionInput({ ...transactionInput, quantity: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block">수수료:</label>
              <input
                type="number"
                value={transactionInput.fee}
                onChange={(e) => setTransactionInput({ ...transactionInput, fee: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => handleTransactionSubmit(isBuying ? '매수' : '매도')}
                className={`w-full text-white py-2 rounded ${isBuying ? 'bg-red-500' : 'bg-blue-500'}`}
              >
                {isBuying ? '매수 등록' : '매도 등록'}
              </button>
              <button
                onClick={handleCancel}
                className="w-full bg-gray-400 text-white py-2 rounded"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 거래 내역 테이블 */}
      {transactions.length > 0 && (
        <table className="w-full border-collapse mt-6">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">No</th>
              <th className="p-2 border">거래 유형</th>
              <th className="p-2 border">날짜</th>
              <th className="p-2 border">체결가</th>
              <th className="p-2 border">수량</th>
              <th className="p-2 border">수수료</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => (
              <tr key={transaction.id || index} className="text-center">
                <td className="p-2 border">{index + 1}</td>
                <td className={`p-2 border ${transaction.type === '매수' ? 'text-red-500' : 'text-blue-500'}`}>
                  {transaction.type}
                </td>
                <td className="p-2 border">{transaction.date}</td>
                <td className="p-2 border">${transaction.price}</td>
                <td className="p-2 border">{Math.abs(transaction.quantity)}</td>
                <td className="p-2 border">${transaction.fee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 매수/매도 버튼 */}
      {!isBuying && !isSelling && (
        <div className="flex justify-between mt-6">
          <button
            onClick={() => { setIsBuying(true); setIsSelling(false); }}
            className="w-full bg-red-500 text-white py-2 rounded mr-2"
          >
            매수
          </button>
          <button
            onClick={() => { setIsSelling(true); setIsBuying(false); }}
            className="w-full bg-blue-500 text-white py-2 rounded"
          >
            매도
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionList;