import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStocks, getTransactionsByStockId, updateStock } from '../db';
import TransactionList from './TransactionList';

const StockDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [averagePrice, setAveragePrice] = useState(0);
  const [perstar, setPerstar] = useState(0); // perstar 상태 추가
  const isLoaded = useRef(false);

  // 데이터 로드 및 초기 계산
  const loadStockData = useCallback(async () => {
    const storedStocks = await getStocks();
    const foundStock = storedStocks.find(stock => stock.id === id);
    if (foundStock) {
      setStock(foundStock);

      const stockTransactions = (await getTransactionsByStockId(id)).sort((a, b) => a.timestamp - b.timestamp);
  
      let totalQuantity = 0;
      let averagePrice = 0;
      let totalProfit = 0;

      stockTransactions.forEach(txn => {
        if (txn.type === '매수') {
          const newPurchaseAmount = txn.price * txn.quantity;
          const newTotalQuantity = totalQuantity + txn.quantity;

          averagePrice = ((averagePrice * totalQuantity) + newPurchaseAmount) / newTotalQuantity;
          totalQuantity = newTotalQuantity;
        } else if (txn.type === '매도') {
          const profitAmount = (txn.price - averagePrice) * Math.abs(txn.quantity);
          totalProfit += profitAmount;
          totalQuantity += txn.quantity;
        }
      });
  
      setTotalQuantity(totalQuantity);
      setAveragePrice(averagePrice);
      setStock(prevStock => ({
        ...prevStock,
        profit: totalProfit,
      }));

      await updateStock(id, {
        quantity: totalQuantity,
        averagePrice: averagePrice,
        profit: totalProfit,
      });

      // `perstar` 계산 추가 (소수 둘째 자리 올림)
      const valueT = Math.ceil((averagePrice * totalQuantity / foundStock.perTradeAmount) * 100) / 100;
      const perstarValue = foundStock.profitGoal - (foundStock.profitGoal / 10) * valueT;
      setPerstar(perstarValue.toFixed(1)); // 소수 첫째 자리까지만 표시


    }
  }, [id]);

  useEffect(() => {
    if (!isLoaded.current) {
      loadStockData();
      isLoaded.current = true;
    }
  }, [loadStockData]);

  if (!stock) {
    return <p>해당 종목을 찾을 수 없습니다.</p>;
  }

  // TransactionList에서 새 거래가 추가된 후 호출될 핸들러
  const handleAddTransaction = async (newTransaction) => {
    const newQuantity = parseInt(newTransaction.quantity, 10);
    const newPrice = parseFloat(newTransaction.price);

    let newTotalQuantity = totalQuantity;
    let newAveragePrice = averagePrice;
    let newProfit = stock.profit;

    if (newTransaction.type === '매수') {
      newTotalQuantity += newQuantity;
      newAveragePrice = ((averagePrice * totalQuantity) + (newPrice * newQuantity)) / newTotalQuantity;
    } else if (newTransaction.type === '매도') {
      newTotalQuantity += newQuantity; // 매도는 이미 음수로 들어옴
      const profitAmount = (newPrice - averagePrice) * Math.abs(newQuantity);
      newProfit += profitAmount;
    }

    setTotalQuantity(newTotalQuantity);
    setAveragePrice(newAveragePrice);
    setStock(prevStock => ({
      ...prevStock,
      profit: newProfit,
    }));

    // `perstar` 업데이트
    const valueT = Math.ceil((newAveragePrice * newTotalQuantity / stock.perTradeAmount) * 100) / 100;
    const perstarValue = stock.profitGoal - (stock.profitGoal / 10) * valueT;
    setPerstar(perstarValue.toFixed(1));

    // DB에 업데이트된 데이터 반영
    await updateStock(id, {
      quantity: newTotalQuantity,
      averagePrice: newAveragePrice,
      profit: newProfit,
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-md">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate('/')} className="text-2xl font-bold text-gray-700 mr-4">&lt;</button>
        <h1 className="text-3xl font-bold">종목 세부 정보</h1>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold">{stock.name} (v{stock.version})</h2>
        <p>총 투자 금액: ${stock.investment}</p>
        <p>1회 매수 금액: ${stock.perTradeAmount}</p>
        <p>목표 수익률: {stock.profitGoal}%</p>
        <p>투자 손익 금액: <span style={{ color: stock.profit > 0 ? 'red' : 'blue' }}>${stock.profit}</span></p>
        <p>평균가: ${averagePrice.toFixed(2)}</p>
        <p>총 수량: {totalQuantity}</p>
      </div>
      <div className="bg-gray-100 p-4 rounded-lg shadow-lg mt-6">
        <h2 className="text-2xl font-semibold" style={{ color: "red" }}>매수 가이드</h2>
        <p>매수 LOC: {averagePrice.toFixed(2)} X {(stock.perTradeAmount/averagePrice/2).toFixed(2)}</p>
        <p>매수 별지점 {perstar}%: {(averagePrice*(1+perstar/100)).toFixed(2)} X {(stock.perTradeAmount/averagePrice/2).toFixed(2)}</p>
        <br />
        <h2 className="text-2xl font-semibold" style={{ color: "blue" }}>매도 가이드</h2>
        <p>매도 LOC:</p>
        <p>매도 After지정: </p>
      </div>
      <TransactionList stockId={id} onAddTransaction={handleAddTransaction} />
    </div>
  );
};

export default StockDetail;