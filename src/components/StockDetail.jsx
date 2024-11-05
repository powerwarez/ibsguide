import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStocks, getTransactionsByStockId } from '../db';
import TransactionList from './TransactionList';

const StockDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [averagePrice, setAveragePrice] = useState(0);
  const isLoaded = useRef(false); // 초기 로딩 여부 추적

  const loadStockData = useCallback(async () => {
    const storedStocks = await getStocks();
    const foundStock = storedStocks.find(stock => stock.id === id);
    setStock(foundStock);
  
    const stockTransactions = (await getTransactionsByStockId(id)).sort((a, b) => a.timestamp - b.timestamp);
  
    let totalQuantity = 0;
    let averagePrice = 0;
    let totalProfit = 0; // 누적 수익 금액 변수 추가
  
    stockTransactions.forEach(txn => {
      if (txn.type === '매수') {
        const newPurchaseAmount = txn.price * txn.quantity;
        const newTotalQuantity = totalQuantity + txn.quantity;
  
        // 새 평균가 계산
        averagePrice = ((averagePrice * totalQuantity) + newPurchaseAmount) / newTotalQuantity;
  
        // 총 수량 업데이트
        totalQuantity = newTotalQuantity;
      } else if (txn.type === '매도') {
        // 매도 시, 수익 계산
        const profitAmount = (txn.price - averagePrice) * Math.abs(txn.quantity);
        totalProfit += profitAmount; // 누적 수익에 추가
  
        // 매도인 경우 수량만 감소, 평균가는 유지
        totalQuantity += txn.quantity; // 매도는 음수로 들어옴
      }
    });
  
    setTotalQuantity(totalQuantity);
    setAveragePrice(averagePrice);
    
    // profit 상태 업데이트
    setStock(prevStock => ({
      ...prevStock,
      profit: totalProfit, // 누적 수익 반영
    }));
  }, [id]);

  useEffect(() => {
    // 초기 로딩 시 한 번만 loadStockData 호출
    if (!isLoaded.current) {
      loadStockData();
      isLoaded.current = true; // 로딩 완료 후 true로 설정
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

    if (newTransaction.type === '매수') {
      newTotalQuantity += newQuantity;
      newAveragePrice = ((averagePrice * totalQuantity) + (newPrice * newQuantity)) / newTotalQuantity;
    } else if (newTransaction.type === '매도') {
      newTotalQuantity += newQuantity; // 매도는 이미 음수로 들어옴
      // 수익 계산: (매도가 - 평균가) * 매도 수량
      const profitAmount = (newPrice - averagePrice) * Math.abs(newQuantity);

      // stock.profit에 수익 반영
      setStock((prevStock) => ({
        ...prevStock,
        profit: prevStock.profit + profitAmount, // profit 누적
      }));
    }

    setTotalQuantity(newTotalQuantity);
    setAveragePrice(newAveragePrice);

    // DB에 직접 저장하지 않고 데이터만 다시 로드
    // await loadStockData();
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
        <p>투자 손익 금액: <font style={{ color: stock.profit > 0 ? 'red' : 'blue' }}>
  ${stock.profit}</font>
</p>
        <p>평균가: ${averagePrice.toFixed(2)}</p>
      </div>
      <div className="bg-gray-100 p-4 rounded-lg shadow-lg mt-6">
      <h2 className="text-2xl font-semibold"><font color = "red">매수</font> 가이드</h2>
      <p>매수 LOC: </p>
      <p>매수 별지점: </p>
      <br></br>
      <h2 className="text-2xl font-semibold"><font color = "blue">매도</font> 가이드</h2>
      <p>매도 LOC:</p>
      <p>매도 After지정: </p>
      </div>
      <TransactionList stockId={id} onAddTransaction={handleAddTransaction} />
    </div>
  );
};

export default StockDetail;