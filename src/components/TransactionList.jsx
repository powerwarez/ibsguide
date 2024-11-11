import React, { useState, useEffect, useCallback } from 'react';
import { addTransaction, getTransactionsByStockId, deleteTransaction } from '../db';

const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// 삭제 확인 모달 컴포넌트
const DeleteModal = ({ transaction, onDeleteConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 w-80 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">거래 삭제 확인</h2>
        <p className="mb-2">정말로 이 거래를 삭제하시겠습니까?</p>
        <p className="text-sm text-gray-700">거래 유형: {transaction.type}</p>
        <p className="text-sm text-gray-700">날짜: {transaction.date}</p>
        <p className="text-sm text-gray-700">가격: ${transaction.price}</p>
        <p className="text-sm text-gray-700">수량: {Math.abs(transaction.quantity)}</p>
        <p className="text-sm text-gray-700">수수료: ${transaction.fee}</p>
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400"
          >
            취소
          </button>
          <button
            onClick={() => onDeleteConfirm(transaction.id)}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

const TransactionList = ({ stockId, onAddTransaction, onDeleteTransaction }) => {
  const [transactions, setTransactions] = useState([]);
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [transactionInput, setTransactionInput] = useState({
    date: new Date().toISOString().slice(0, 10),
    price: '',
    quantity: '',
    fee: '',
  });
  const [transactionToDelete, setTransactionToDelete] = useState(null); // 삭제할 트랜잭션 저장

  const loadTransactions = useCallback(async () => {
    const storedTransactions = await getTransactionsByStockId(stockId);
    const sortedTransactions = storedTransactions.sort((a, b) => b.timestamp - a.timestamp);
    setTransactions(sortedTransactions);
  }, [stockId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleTransactionSubmit = async (type) => {
    try {
      const newQuantity = type === '매도' ? -Math.abs(transactionInput.quantity) : parseInt(transactionInput.quantity, 10);
      const inputDate = new Date(transactionInput.date);
      const currentTime = new Date();
      const timestamp = new Date(
        inputDate.getFullYear(),
        inputDate.getMonth(),
        inputDate.getDate(),
        currentTime.getHours(),
        currentTime.getMinutes(),
        currentTime.getSeconds()
      ).getTime();

      const newTransaction = {
        ...transactionInput,
        id: generateUniqueId(),
        quantity: newQuantity,
        type,
        timestamp,
        stockId
      };

      await addTransaction(stockId, newTransaction);
      setTransactions(prevTransactions => [newTransaction, ...prevTransactions]);

      setTransactionInput({
        date: new Date().toISOString().slice(0, 10),
        price: '',
        quantity: '',
        fee: ''
      });
      setIsBuying(false);
      setIsSelling(false);

      await loadTransactions();
      onAddTransaction();
    } catch (error) {
      console.error('거래 추가 중 오류 발생:', error);
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

  // 삭제 버튼 클릭 시 모달 표시
  const handleDeleteClick = (transaction) => {
    setTransactionToDelete(transaction);
  };

  // 모달에서 삭제 확인 시 실행되는 함수
  const handleDeleteConfirm = async (transactionId) => {
    await deleteTransaction(transactionId);
    setTransactions(prevTransactions => prevTransactions.filter(txn => txn.id !== transactionId));
    onDeleteTransaction();
    setTransactionToDelete(null); // 모달 닫기
  };

  const handleDeleteCancel = () => {
    setTransactionToDelete(null); // 모달 닫기
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow-lg mt-6">
      {/* 삭제 모달 표시 */}
      {transactionToDelete && (
        <DeleteModal
          transaction={transactionToDelete}
          onDeleteConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

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
              <th className="p-2 border">삭제</th>
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
                <td className="p-2 border text-center">
                  <button
                    onClick={() => handleDeleteClick(transaction)}
                    className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    X
                  </button>
                </td>
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