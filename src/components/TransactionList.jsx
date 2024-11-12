import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom'; // useNavigate 추가
import { addTransaction, getTransactionsByStockId, deleteTransaction, updateStock, getStockById } from '../db';
import TransactionForm from './TransactionForm';
import TransactionTable from './TransactionTable';
import DeleteModal from './DeleteModal';
import ConfirmSettlementModal from './ConfirmSettlementModal';

const TransactionList = ({ stockId, onAddTransaction, onDeleteTransaction }) => {
  const [transactions, setTransactions] = useState([]);
  const [isSettled, setIsSettled] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [transactionInput, setTransactionInput] = useState({
    date: new Date().toISOString().slice(0, 10),
    price: '',
    quantity: '',
    fee: '',
  });
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementDate, setSettlementDate] = useState(null);
  const navigate = useNavigate(); // useNavigate 사용

  // 트랜잭션 및 종목 정보를 로드하는 함수
  const loadTransactions = useCallback(async () => {
    try {
      const storedTransactions = await getTransactionsByStockId(stockId);
      const stock = await getStockById(stockId);
      setTransactions(storedTransactions.sort((a, b) => b.timestamp - a.timestamp));
      setIsSettled(stock?.isSettled || false);
    } catch (error) {
      console.error("Error loading transactions:", error);
    }
  }, [stockId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // 정산 처리 함수
  const handleSettlement = async () => {
    try {
      const stock = await getStockById(stockId);
      const updatedName = `${stock.name}(${settlementDate} 정산)`;

      await updateStock(stockId, { isSettled: true, name: updatedName });
      setShowSettlementModal(false);
      setIsSettled(true);
      // 정산 후 메인 페이지로 이동하며 '정산됨' 탭으로 설정
      navigate('/', { state: { selectedTab: '정산됨' } });
    } catch (error) {
      console.error("Error during settlement:", error);
    }
  };

  // 매수/매도 트랜잭션 추가 함수
  const handleTransactionSubmit = async (type) => {
    try {
      const newQuantity = type === '매도' ? -Math.abs(transactionInput.quantity) : parseInt(transactionInput.quantity, 10);
      const timestamp = new Date().getTime();

      const newTransaction = {
        ...transactionInput,
        id: uuidv4(),
        quantity: newQuantity,
        type,
        timestamp,
        stockId,
      };

      await addTransaction(stockId, newTransaction);

      const updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);

      // 총 수량 계산 후 정산 여부 결정
      const totalQuantity = updatedTransactions.reduce((sum, txn) => sum + txn.quantity, 0);
      if (totalQuantity === 0 && type === '매도') {
        const date = new Date(transactionInput.date);
        const formattedDate = `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, '0')}월 ${String(date.getDate()).padStart(2, '0')}일`;
        setSettlementDate(formattedDate);
        setShowSettlementModal(true);
      } else {
        resetTransactionInput();
      }
      await loadTransactions();
      onAddTransaction?.();
    } catch (error) {
      console.error('Error adding transaction:', error);
      await loadTransactions();
    }
  };

  // 트랜잭션 입력 필드를 초기화하는 함수
  const resetTransactionInput = () => {
    setTransactionInput({
      date: new Date().toISOString().slice(0, 10),
      price: '',
      quantity: '',
      fee: '',
    });
    setIsBuying(false);
    setIsSelling(false);
  };

  // 트랜잭션 삭제 확인 함수
  const handleDeleteConfirm = async (transactionId) => {
    try {
      await deleteTransaction(transactionId);
      setTransactions((prevTransactions) => prevTransactions.filter((txn) => txn.id !== transactionId));
      onDeleteTransaction?.();
      setTransactionToDelete(null);
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow-lg mt-6">
      {transactionToDelete && (
        <DeleteModal
          transaction={transactionToDelete}
          onDeleteConfirm={handleDeleteConfirm}
          onCancel={() => setTransactionToDelete(null)}
        />
      )}

      {showSettlementModal && (
        <ConfirmSettlementModal
          onConfirm={handleSettlement}
          onCancel={() => setShowSettlementModal(false)}
        />
      )}

      {/* 매수/매도 입력 폼 */}
      {(!isSettled && (isBuying || isSelling)) && (
        <TransactionForm
          transactionInput={transactionInput}
          setTransactionInput={setTransactionInput}
          handleTransactionSubmit={handleTransactionSubmit}
          handleCancel={resetTransactionInput}
          isBuying={isBuying}
          isSelling={isSelling}
        />
      )}

      {/* 거래 내역 테이블 */}
      <TransactionTable
        transactions={transactions}
        isSettled={isSettled}
        onDeleteClick={(transaction) => setTransactionToDelete(transaction)}
      />

      {/* 매수/매도 버튼 */}
      {!isSettled && !isBuying && !isSelling && (
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