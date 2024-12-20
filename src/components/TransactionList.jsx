import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { addTransaction, getTransactionsByStockId, deleteTransaction, updateStock, getStockById, saveOriginalInvestment, getOriginalInvestment } from '../db';
import TransactionForm from './TransactionForm';
import TransactionTable from './TransactionTable';
import DeleteModal from './DeleteModal';
import ConfirmSettlementModal from './ConfirmSettlementModal';

const TransactionList = ({ stockId, onAddTransaction, onDeleteTransaction, onEarliestDateChange, perstar, averagePrice }) => {
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
  const [originalInvestment, setOriginalInvestment] = useState(null);
  const [originalPerTradeAmount, setOriginalPerTradeAmount] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadStockData = async () => {
      const stock = await getStockById(stockId);
      const originalInvestmentData = await getOriginalInvestment(stockId);
      setOriginalInvestment(originalInvestmentData?.data || stock.investment);
      setOriginalPerTradeAmount(stock.perTradeAmount);
    };
    loadStockData();
  }, [stockId]);

  const loadTransactions = useCallback(async () => {
    try {
      const storedTransactions = await getTransactionsByStockId(stockId);
      console.log("Loaded transactions:", storedTransactions);

      const stock = await getStockById(stockId);
      setTransactions(storedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setIsSettled(stock?.isSettled || false);

      if (storedTransactions.length > 0) {
        const earliestDate = new Date(Math.min(...storedTransactions.map(txn => new Date(txn.date).getTime())));
        console.log("Earliest transaction date:", earliestDate);
        onEarliestDateChange(earliestDate.toISOString().slice(0, 10));
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    }
  }, [stockId, onEarliestDateChange]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSettlement = async () => {
    try {
      const stock = await getStockById(stockId);
      const updatedName = `${stock.name}(${settlementDate} 정산)`;
      await updateStock(stockId, { isSettled: true, name: updatedName });
      setShowSettlementModal(false);
      setIsSettled(true);
      navigate('/', { state: { selectedTab: '정산됨' } });
    } catch (error) {
      console.error("Error during settlement:", error);
    }
  };

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
  
      console.log("New transaction:", newTransaction);
  
      await addTransaction(stockId, newTransaction);
  
      const updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);
  
      const stock = await getStockById(stockId);
      const totalQuantity = updatedTransactions.reduce((sum, txn) => sum + txn.quantity, 0);
      console.log("Total quantity after transaction:", totalQuantity);
  
      if (type === '매도' && stock.version === '3.0' && transactionInput.price > averagePrice) {
        const additionalInvestment = ((transactionInput.price - averagePrice) * Math.abs(newQuantity)) / 2;
        const updatedInvestment = stock.investment + additionalInvestment;
        const updatedPerTradeAmount = updatedInvestment / stock.divisionCount;
  
        await updateStock(stockId, { 
          investment: updatedInvestment,
          perTradeAmount: updatedPerTradeAmount
        });

        const originalData = await getOriginalInvestment(stockId) || { data: [] };
        originalData.data.push({ id: newTransaction.id, additionalInvestment });
        await saveOriginalInvestment(stockId, originalData.data);
      }
  
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

  const handleDeleteConfirm = async (transactionId) => {
    try {
      const transactionToRemove = transactions.find(txn => txn.id === transactionId);
      await deleteTransaction(transactionId);
      setTransactions((prevTransactions) => prevTransactions.filter((txn) => txn.id !== transactionId));
      
      const stock = await getStockById(stockId);
      
      if (stock.version === '3.0' && transactionToRemove.type === '매도') {
        const originalData = await getOriginalInvestment(stockId);
        const sellTransaction = originalData?.data.find(txn => txn.id === transactionId);
        if (sellTransaction) {
          const updatedInvestment = stock.investment - (sellTransaction.additionalInvestment);
          const updatedPerTradeAmount = updatedInvestment / stock.divisionCount;
          await updateStock(stockId, { 
            investment: updatedInvestment,
            perTradeAmount: updatedPerTradeAmount
          });
          originalData.data = originalData.data.filter(txn => txn.id !== transactionId);
          await saveOriginalInvestment(stockId, originalData.data);
        }
      }

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

      {!isSettled && !isBuying && !isSelling && (
        <>
          <h2 className="text-2xl font-semibold" style={{ color: "black" }}>매수 매도 리스트</h2>
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
        </>
      )}

      <TransactionTable
        transactions={transactions}
        isSettled={isSettled}
        onDeleteClick={(transaction) => setTransactionToDelete(transaction)}
      />
    </div>
  );
};

export default TransactionList;