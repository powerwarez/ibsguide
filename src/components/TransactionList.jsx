import React, { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import {
  addTransaction,
  getTransactionsByStockId,
  deleteTransaction,
  updateStock,
  getStockById,
  saveOriginalInvestment,
  getOriginalInvestment,
} from "../db";
import TransactionForm from "./TransactionForm";
import TransactionTable from "./TransactionTable";
import DeleteModal from "./DeleteModal";
import ConfirmSettlementModal from "./ConfirmSettlementModal";
import TransactionChangeModal from "./TransactionChangeModal";

const TransactionList = ({
  stockId,
  onAddTransaction,
  onDeleteTransaction,
  onEarliestDateChange,
  perstar,
  averagePrice,
  calculatedValueT,
  totalQuantity,
}) => {
  const [transactions, setTransactions] = useState([]);
  const [isSettled, setIsSettled] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [stock, setStock] = useState(null);
  const [transactionInput, setTransactionInput] = useState({
    date: new Date().toISOString().slice(0, 10),
    price: "",
    quantity: "",
    fee: "",
    memo: "",
  });
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementDate, setSettlementDate] = useState(null);
  // eslint-disable-next-line
  const [originalInvestment, setOriginalInvestment] = useState(null);
  // eslint-disable-next-line
  const [originalPerTradeAmount, setOriginalPerTradeAmount] = useState(null);
  // 트랜잭션 변화를 저장하는 상태
  const [transactionChanges, setTransactionChanges] = useState(null);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [transactionType, setTransactionType] = useState("");
  // eslint-disable-next-line
  const [previousValues, setPreviousValues] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const loadStockData = async () => {
      const stock = await getStockById(stockId);
      setStock(stock);
      const originalInvestmentData = await getOriginalInvestment(stockId);
      setOriginalInvestment(originalInvestmentData?.data || stock.investment);
      setOriginalPerTradeAmount(stock.perTradeAmount);
    };
    loadStockData();
  }, [stockId, calculatedValueT]);

  const loadTransactions = useCallback(async () => {
    try {
      const storedTransactions = await getTransactionsByStockId(stockId);
      console.log("Loaded transactions:", storedTransactions);

      const stock = await getStockById(stockId);
      setTransactions(
        storedTransactions.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );
      setIsSettled(stock?.isSettled || false);

      if (storedTransactions.length > 0) {
        const earliestDate = new Date(
          Math.min(
            ...storedTransactions.map((txn) => new Date(txn.date).getTime())
          )
        );
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
      navigate("/", { state: { selectedTab: "정산됨" } });
    } catch (error) {
      console.error("Error during settlement:", error);
    }
  };

  const handleTransactionSubmit = async (type, transactionData = transactionInput) => {
    try {
      // 이전 상태 저장
      const stock = await getStockById(stockId);
      const prevState = {
        averagePrice: stock.averagePrice || 0,
        quantity: stock.quantity || 0,
        tValue: calculatedValueT || 0,
        cashBalance: stock.cashBalance || 0,
        profit: stock.profit || 0,
      };

      const newQuantity =
        type === "매도"
          ? -Math.abs(parseInt(transactionData.quantity, 10))
          : parseInt(transactionData.quantity, 10);
      const timestamp = new Date().getTime();
      const price = parseFloat(transactionData.price);

      const newTransaction = {
        ...transactionData,
        id: uuidv4(),
        quantity: newQuantity,
        type,
        timestamp,
        stockId,
        price,
      };

      console.log("New transaction:", newTransaction);

      await addTransaction(stockId, newTransaction);

      const updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);

      // 캐시 밸런스 계산 (예수금)
      const transactionCost = price * Math.abs(newQuantity);
      const cashBalanceChange =
        type === "매도" ? transactionCost : -transactionCost;
      const newCashBalance = (stock.cashBalance || 0) + cashBalanceChange;

      // 수량, 평균가, T값 계산
      let newAveragePrice = prevState.averagePrice;
      let newTotalQuantity = prevState.quantity;
      let profitChange = 0;

      if (type === "매수") {
        // 매수인 경우 평균가 다시 계산
        const totalValue = prevState.averagePrice * prevState.quantity;
        const newPurchaseValue = price * newQuantity;
        const totalQuantityAfterPurchase = prevState.quantity + newQuantity;

        if (totalQuantityAfterPurchase > 0) {
          newAveragePrice =
            (totalValue + newPurchaseValue) / totalQuantityAfterPurchase;
        }
        newTotalQuantity = totalQuantityAfterPurchase;
      } else {
        // 매도인 경우
        if (prevState.quantity > 0 && price > 0) {
          // 매도 수익 계산
          profitChange =
            (price - prevState.averagePrice) * Math.abs(newQuantity);
          // 수량만 감소 (평균가 유지)
          newTotalQuantity = prevState.quantity + newQuantity;
        }
      }

      // T값 계산
      const newInvestedValue = newAveragePrice * newTotalQuantity;
      const newTValue = newInvestedValue / stock.perTradeAmount;

      // DB 업데이트
      await updateStock(stockId, {
        averagePrice: newAveragePrice,
        quantity: newTotalQuantity,
        cashBalance: newCashBalance,
        profit: (stock.profit || 0) + profitChange,
      });

      // 복리 투자 로직 (버전 3.0 매도 시에만)
      if (
        type === "매도" &&
        stock.version === "3.0" &&
        price > prevState.averagePrice
      ) {
        const additionalInvestment =
          (price - prevState.averagePrice) *
          Math.abs(newQuantity) *
          stock.compoundInterestRate;
        const updatedInvestment = stock.investment + additionalInvestment;
        const updatedPerTradeAmount = updatedInvestment / stock.divisionCount;

        await updateStock(stockId, {
          investment: updatedInvestment,
          perTradeAmount: updatedPerTradeAmount,
        });

        const originalData = (await getOriginalInvestment(stockId)) || {
          data: [],
        };
        originalData.data.push({ id: newTransaction.id, additionalInvestment });
        await saveOriginalInvestment(stockId, originalData.data);
      }

      // 트랜잭션 완료 후 업데이트된 상태 가져오기
      await onAddTransaction?.();

      // 변화 계산 및 모달 표시
      const changes = {
        averagePrice: {
          new: newAveragePrice,
          change:
            type === "매수" ? newAveragePrice - prevState.averagePrice : 0,
        },
        quantity: {
          new: newTotalQuantity,
          change: newQuantity, // 추가/감소된 수량은 트랜잭션 수량
        },
        tValue: {
          new: newTValue,
          change: newTValue - prevState.tValue,
        },
        cashBalance: {
          new: newCashBalance,
          change: cashBalanceChange,
        },
      };

      if (type === "매도") {
        changes.profit = {
          new: (stock.profit || 0) + profitChange,
          change: profitChange,
        };
      }

      setTransactionType(type);
      setTransactionChanges(changes);
      setShowChangeModal(true);

      if (newTotalQuantity === 0 && type === "매도") {
        const date = new Date(transactionData.date);
        const formattedDate = `${date.getFullYear()}년 ${String(
          date.getMonth() + 1
        ).padStart(2, "0")}월 ${String(date.getDate()).padStart(2, "0")}일`;
        setSettlementDate(formattedDate);
        setShowSettlementModal(true);
      } else {
        resetTransactionInput();
      }

      await loadTransactions();
    } catch (error) {
      console.error("Error adding transaction:", error);
      await loadTransactions();
    }
  };

  const resetTransactionInput = () => {
    setTransactionInput({
      date: new Date().toISOString().slice(0, 10),
      price: "",
      quantity: "",
      fee: "",
      memo: "",
    });
    setIsBuying(false);
    setIsSelling(false);
  };

  const handleDeleteConfirm = async (transactionId) => {
    try {
      const transactionToRemove = transactions.find(
        (txn) => txn.id === transactionId
      );
      await deleteTransaction(transactionId);
      setTransactions((prevTransactions) =>
        prevTransactions.filter((txn) => txn.id !== transactionId)
      );

      const stock = await getStockById(stockId);

      if (stock.version === "3.0" && transactionToRemove.type === "매도") {
        const originalData = await getOriginalInvestment(stockId);
        const sellTransaction = originalData?.data.find(
          (txn) => txn.id === transactionId
        );
        if (sellTransaction) {
          const updatedInvestment =
            stock.investment - sellTransaction.additionalInvestment;
          const updatedPerTradeAmount = updatedInvestment / stock.divisionCount;
          await updateStock(stockId, {
            investment: updatedInvestment,
            perTradeAmount: updatedPerTradeAmount,
          });
          originalData.data = originalData.data.filter(
            (txn) => txn.id !== transactionId
          );
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

      {showChangeModal && transactionChanges && (
        <TransactionChangeModal
          changes={transactionChanges}
          transactionType={transactionType}
          onClose={() => setShowChangeModal(false)}
        />
      )}

      {!isSettled && (isBuying || isSelling) && (
        <TransactionForm
          transactionInput={transactionInput}
          setTransactionInput={setTransactionInput}
          handleTransactionSubmit={handleTransactionSubmit}
          handleCancel={resetTransactionInput}
          isBuying={isBuying}
          isSelling={isSelling}
          stock={stock}
        />
      )}

      {!isSettled && !isBuying && !isSelling && (
        <>
          <h2 className="text-2xl font-semibold" style={{ color: "black" }}>
            매수 매도 리스트
          </h2>
          <div className="flex justify-between mt-6">
            <button
              onClick={() => {
                setIsBuying(true);
                setIsSelling(false);
              }}
              className="w-full bg-red-500 text-white py-2 rounded mr-2"
            >
              매수
            </button>
            <button
              onClick={() => {
                setIsSelling(true);
                setIsBuying(false);
              }}
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
