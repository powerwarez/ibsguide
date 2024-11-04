import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStocks, getTransactionsByStockId } from '../db';
import TransactionList from './TransactionList';

const StockDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [averagePrice, setAveragePrice] = useState(0);

  const loadStockData = async () => {
    const storedStocks = await getStocks();
    const foundStock = storedStocks.find(stock => stock.id === id);
    setStock(foundStock);

    // 거래 내역을 불러와서 보유 수량 및 평균가 계산
    const stockTransactions = await getTransactionsByStockId(id);
    const initialQuantity = stockTransactions.reduce((acc, txn) => acc + txn.quantity, 0);
    const initialAveragePrice = initialQuantity > 0
      ? stockTransactions.reduce((acc, txn) => acc + txn.price * txn.quantity, 0) / initialQuantity
      : 0;
    setTotalQuantity(initialQuantity);
    setAveragePrice(initialAveragePrice);
  };

  useEffect(() => {
    loadStockData();
  }, [id]);

  if (!stock) {
    return <p>해당 종목을 찾을 수 없습니다.</p>;
  }

  // TransactionList에서 새 거래가 추가된 후 호출될 핸들러
  const handleAddTransaction = async (newTransaction) => {
    const newQuantity = parseInt(newTransaction.quantity, 10);
    const newPrice = parseFloat(newTransaction.price);

    let newTotalQuantity = totalQuantity;
    let newAveragePrice = averagePrice;

    if (newTransaction.type === '매수') {
      newTotalQuantity += newQuantity;
      newAveragePrice = ((averagePrice * totalQuantity) + (newPrice * newQuantity)) / newTotalQuantity;
    } else if (newTransaction.type === '매도') {
      newTotalQuantity += newQuantity; // 매도는 이미 음수로 들어옴
    }

    setTotalQuantity(newTotalQuantity);
    setAveragePrice(newAveragePrice);

    // DB에 직접 저장하지 않고 데이터만 다시 로드
    await loadStockData();
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
        <p>투자 손익 금액: ${stock.profit}</p>
        <p>평균가: ${averagePrice.toFixed(2)}</p>
      </div>

      <TransactionList stockId={id} onAddTransaction={handleAddTransaction} />
    </div>
  );
};

export default StockDetail;