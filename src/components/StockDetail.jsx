import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStocks, getTransactionsByStockId, updateStock } from '../db';
import TransactionList from './TransactionList';

const StockDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [averagePrice, setAveragePrice] = useState(0);
  const [perstar, setPerstar] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);

  const loadStockData = useCallback(async () => {
    const storedStocks = await getStocks();
    const foundStock = storedStocks.find(stock => stock.id === id);
    if (foundStock) {
      setStock(foundStock);

      const stockTransactions = (await getTransactionsByStockId(id)).sort((a, b) => a.timestamp - b.timestamp);
      setTransactionCount(stockTransactions.length);

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
      console.log("***************************************")
      console.log("averagePrice", averagePrice)
      console.log("totalQuantity", totalQuantity)
      console.log("perTradeAmount", foundStock.perTradeAmount)
      console.log("calculatedValueT", Math.ceil((averagePrice * totalQuantity / foundStock.perTradeAmount) * 100) / 100)
      // valueT 계산 후 상태 업데이트
      const calculatedValueT = Math.ceil((averagePrice * totalQuantity / foundStock.perTradeAmount) * 100) / 100;
      
      // version에 따라 perstarValue 계산
      const perstarValue = foundStock.profitGoal - (foundStock.profitGoal / (foundStock.divisionCount/2)) * calculatedValueT

      setPerstar(perstarValue.toFixed(1));

      await updateStock(id, {
        quantity: totalQuantity,
        averagePrice: averagePrice,
        profit: totalProfit,
      });

    // quarterCutMode가 시작되는 조건을 확인
    if (foundStock.version === "2.2" && foundStock.divisionCount - calculatedValueT < 1 && !foundStock.quarterCutMode) {
      await updateStock(id, { quarterCutMode: true, cutModetransactionCounter: stockTransactions.length });
      // 업데이트된 데이터 다시 로드
      await loadStockData();
      return; // 중복 호출 방지
    }

    const postCutTransactions = stockTransactions.slice(foundStock.cutModetransactionCounter);
    const recentSellCount = postCutTransactions.filter(txn => txn.type === '매도').length;

    if (recentSellCount >= 2 && foundStock.quarterCutMode) {
      await updateStock(id, { quarterCutMode: false, cutModetransactionCounter: -1 });
      await loadStockData();
    }
    console.log("foundStock.divisionCount - calculatedValueT", foundStock.divisionCount - calculatedValueT)
    console.log("calculatedValueT", calculatedValueT)
    console.log("quarterCutMode", foundStock.quarterCutMode)

    // 추가 조건: transactionCount - stock.cutModetransactionCounter === 1일 때 가장 최근 매도 가격 확인
    if (
      foundStock.quarterCutMode === true &&
      transactionCount - foundStock.cutModetransactionCounter === 1
    ) {
      const lastTransaction = stockTransactions[stockTransactions.length - 1];
      
      if (lastTransaction.type === '매도' && lastTransaction.price > averagePrice * (1 - foundStock.profitGoal / 100)) {
        await updateStock(id, { quarterCutMode: false, cutModetransactionCounter: -1 });
        await loadStockData();
      }
    }
    
    }
  }, [id, transactionCount]);

  useEffect(() => {
    loadStockData();
  }, [loadStockData]);

  if (!stock) {
    return <p>해당 종목을 찾을 수 없습니다.</p>;
  }

  const handleTransactionUpdate = () => {
    loadStockData();
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
        <p>분할 횟수: {stock.divisionCount}회</p>
        <p>1회 매수 금액: ${stock.perTradeAmount}</p>
        <p>목표 수익률: {stock.profitGoal}%</p>
        <p>투자 손익 금액: <span style={{ color: stock.profit > 0 ? 'red' : 'blue' }}>${stock.profit}</span></p>
        <p>평균가: ${averagePrice.toFixed(2)}</p>
        <p>총 수량: {totalQuantity}</p>
        <p>총 매수금액: ${(averagePrice.toFixed(2) * totalQuantity).toFixed(2)}</p>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg shadow-lg mt-6">
      <h2 className="text-2xl font-semibold" style={{ color: "red" }}>
  매수 가이드
  {stock.quarterCutMode === true && transactionCount - stock.cutModetransactionCounter <= 10 && (
    <span>
      {Array.from({ length: 11-(transactionCount - stock.cutModetransactionCounter) }, () => '⭐').join('')}
    </span>
  )}
</h2>
        {transactionCount > 0 ? (
          <> {/* 트랜잭션 있음 */}
            {stock.quarterCutMode === true ? (
              transactionCount - stock.cutModetransactionCounter === 0 ?(
                <>
                <p>지정 회차를 모두 소진하였습니다. 쿼터 손절모드를 시작합니다.</p>
                </>
              ):(
              <>
                <p>지정 회차를 모두 소진하였습니다. '⭐'일 동안 쿼터 손절모드로 운영합니다.</p>
                <p>쿼터손절모드 -{stock.profitGoal}% LOC매수: {(averagePrice * (1 - stock.profitGoal / 100)).toFixed(2)} X {Math.floor(stock.perTradeAmount / (averagePrice * (1 - stock.profitGoal / 100)))}개</p>
              </>
              )
            ) : (
              perstar >= 0 && stock.version === "2.2" ? (
                <> {/* 2.2 전후반전 매수 시작 */}
                  <h3>전반전 매수</h3>
                  <p>매수 LOC: {averagePrice.toFixed(2)} X {(stock.perTradeAmount / averagePrice / 2).toFixed(0)}개</p>
                  <p>매수 LOC 별지점 {perstar}%: {(averagePrice * (1 + perstar / 100) - 0.01).toFixed(2)} X {(stock.perTradeAmount / (averagePrice * (1 + perstar / 100) - 0.01) / 2).toFixed(0)}개</p>
                </>
              ) : (
                <> {/* 2.2 후반전 매수 */}
                  <h3>후반전 매수</h3>
                  <p>매수 LOC 별지점 {perstar}%: {(averagePrice * (1 + perstar / 100) - 0.01).toFixed(2)} X {(stock.perTradeAmount / (averagePrice * (1 + perstar / 100) - 0.01)).toFixed(0)}개</p>
                </>
              )
            )}
          </>
        ) : (
          <p>입력된 매수 수량이 없습니다.</p>
        )}
        <br />
        <h2 className="text-2xl font-semibold" style={{ color: "blue" }}>매도 가이드</h2>
        {transactionCount > 0 ? (
            <>
              {stock.quarterCutMode === true ? (
                <>
                  {/* quarterCutMode가 시작되었고, transactionCount가 cutModetransactionCounter와 같은 경우 */}
                  {transactionCount - stock.cutModetransactionCounter === 0 ? (
                    <>
                      <p>지정 회차를 모두 소진하였습니다. 쿼터손절모드를 시작합니다.</p>
                      <p>쿼터손절모드 MOC매도: {Math.floor(totalQuantity / 4)}개</p>
                    </>
                  ) : (
                    <>
                      {/* quarterCutMode가 활성화된 상태에서 10개 미만의 트랜잭션이 발생한 경우 */}
                      {transactionCount - stock.cutModetransactionCounter <= 10 ? (
                        <>
                          <p>쿼터손절모드 -{stock.profitGoal}% LOC매도: {(averagePrice * (1-stock.profitGoal/100)).toFixed(2)} X {Math.floor(totalQuantity / 4)}개</p>
                          <p>쿼터손절모드 {stock.profitGoal}% after지정매도: {(averagePrice * (1+stock.profitGoal/100)).toFixed(2)} X {Math.floor(totalQuantity-(totalQuantity / 4))}개</p>
                          {/* cutModetransactionCounter가 -1일 때만 업데이트 */}
                          {stock.cutModetransactionCounter === -1 && (() => {
                            stock.cutModetransactionCounter = transactionCount;
                          })()}
                        </>
                      ) : (
                        <>
                          {/* 10개 이상의 트랜잭션이 발생한 경우 매도 안내 */}
                          {/* cutModetransactionCounter 업데이트 */}
                            {(() => {
                              updateStock(stock.id, { cutModetransactionCounter: transactionCount })
                              handleTransactionUpdate();
                            })()}
                        </>
                      )}
                    </>
                  )}
                </>
                ) : (
                  <>
                    {/* quarterCutMode가 비활성화된 상태의 일반 매도 안내 */}
                    <p>매도 LOC 별지점 {perstar}%: {(averagePrice * (1 + perstar / 100)).toFixed(2)} X {(totalQuantity / 4).toFixed(0)}</p>
                    <p>매도 After지정: {(averagePrice * (1 + (stock.profitGoal / 100))).toFixed(2)} X {(totalQuantity - (totalQuantity / 4).toFixed(0)).toFixed(0)}</p>
                  </>
                )}
              </>
        ) : (
          <p>입력된 매수 수량이 없습니다.</p>
        )}
      </div>
      
      <TransactionList stockId={id} perstar={perstar} onAddTransaction={handleTransactionUpdate} onDeleteTransaction={handleTransactionUpdate} />
    </div>
  );
};

export default StockDetail;