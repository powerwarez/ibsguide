import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStocks, getTransactionsByStockId, updateStock } from "../db";
import TransactionList from "./TransactionList";
import StockTrackerComponent from "./StockTrackerComponent";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const StockDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [averagePrice, setAveragePrice] = useState(0);
  const [perstar, setPerstar] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [starCounter, setStarCounter] = useState(0);
  const [cutModePerTradeAmount, setCutModePerTradeAmount] = useState(0);
  const [calculatedValueT, setCalculatedValueT] = useState(0);
  const [earliestTransactionDate, setEarliestTransactionDate] = useState(null);
  const [stockTransactions, setStockTransactions] = useState([]);
  const [previousClosePrice, setPreviousClosePrice] = useState(null);

  useEffect(() => {
    if (stock) {
      if (stock.version === "2.2") {
        setStarCounter(10);
      } else if (stock.version === "3.0") {
        setStarCounter(5);
      }
    }
  }, [stock]);

  const loadStockData = useCallback(async () => {
    const storedStocks = await getStocks();
    const foundStock = storedStocks.find((stock) => stock.id === id);
    if (foundStock) {
      setStock(foundStock);

      const stockTransactions = (await getTransactionsByStockId(id)).sort(
        (a, b) => a.timestamp - b.timestamp
      );
      setStockTransactions(stockTransactions);
      setTransactionCount(stockTransactions.length);

      let totalQuantity = 0;
      let averagePrice = 0;
      let totalProfit = 0;

      stockTransactions.forEach((txn) => {
        if (txn.type === "매수") {
          const newPurchaseAmount = txn.price * txn.quantity;
          const newTotalQuantity = totalQuantity + txn.quantity;
          averagePrice =
            (averagePrice * totalQuantity + newPurchaseAmount) /
            newTotalQuantity;
          totalQuantity = newTotalQuantity;
        } else if (txn.type === "매도") {
          const profitAmount =
            (txn.price - averagePrice) * Math.abs(txn.quantity);
          totalProfit += profitAmount;
          totalQuantity += txn.quantity;
        }
      });

      setTotalQuantity(totalQuantity);
      setAveragePrice(averagePrice);
      setStock((prevStock) => ({
        ...prevStock,
        profit: totalProfit,
      }));

      // T값 계산
      const investedValue = averagePrice * totalQuantity;
      const valueT = investedValue / foundStock.perTradeAmount;
      const roundedInvestedPercentage = Math.ceil(valueT * 10) / 10;
      setCalculatedValueT(roundedInvestedPercentage);

      // version에 따라 perstarValue 계산
      const perstarValue =
        foundStock.profitGoal -
        (foundStock.profitGoal / (foundStock.divisionCount / 2)) *
          roundedInvestedPercentage;
      setPerstar(perstarValue.toFixed(1));

      await updateStock(id, {
        quantity: totalQuantity,
        averagePrice: averagePrice,
        profit: totalProfit,
      });

      // Supabase에서 전일 종가 가져오기
      const { data: stockData, error } = await supabase
        .from("stock_prices")
        .select("prices")
        .eq("ticker", foundStock.name)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching previous close price:", error);
      } else if (stockData.length > 0) {
        const prices = stockData[0].prices;
        const lastPrice = prices[prices.length - 1]?.price;
        setPreviousClosePrice(lastPrice);
      }

      // quarterCutMode가 시작되는 조건을 확인
      if (
        (foundStock.version === "2.2" || foundStock.version === "3.0") &&
        foundStock.divisionCount - roundedInvestedPercentage < 1 &&
        !foundStock.quarterCutMode
      ) {
        await updateStock(id, {
          quarterCutMode: true,
          cutModetransactionCounter: stockTransactions.length,
        });
        // 업데이트된 데이터 다시 로드
        await loadStockData();
        return;
      }

      const postCutTransactions = stockTransactions.slice(
        foundStock.cutModetransactionCounter
      );
      const recentSellCount = postCutTransactions.filter(
        (txn) => txn.type === "매도"
      ).length;

      if (recentSellCount >= 2 && foundStock.quarterCutMode) {
        await updateStock(id, {
          quarterCutMode: false,
          cutModetransactionCounter: -1,
        });
        await loadStockData();
      }

      // 추가 조건: transactionCount - stock.cutModetransactionCounter === 1일 때 가장 최근 매도 가격 확인
      if (
        foundStock.quarterCutMode === true &&
        transactionCount - foundStock.cutModetransactionCounter === 1
      ) {
        const lastTransaction = stockTransactions[stockTransactions.length - 1];
        setCutModePerTradeAmount(
          (
            (lastTransaction.price * Math.abs(lastTransaction.quantity)) /
            starCounter
          ).toFixed(2)
        );
        if (
          lastTransaction.type === "매도" &&
          lastTransaction.price >
            averagePrice * (1 - foundStock.profitGoal / 100)
        ) {
          await updateStock(id, {
            quarterCutMode: false,
            cutModetransactionCounter: -1,
          });
          await loadStockData();
        }
      }
    }
  }, [id, transactionCount, starCounter]);

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
        <button
          onClick={() => navigate("/")}
          className="text-2xl font-bold text-gray-700 mr-4"
        >
          &lt;
        </button>
        <h1 className="text-3xl font-bold">종목 세부 정보</h1>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold">
          {stock.name} (v{stock.version})
        </h2>
        <p>총 투자 금액: ${stock.investment.toFixed(2)}</p>
        <p>분할 횟수: {stock.divisionCount}회</p>
        <p>1회 매수 금액: ${stock.perTradeAmount.toFixed(2)}</p>
        <p>목표 수익률: {stock.profitGoal}%</p>
        <p>
          투자 손익 금액:{" "}
          <span style={{ color: stock.profit > 0 ? "red" : "blue" }}>
            ${stock.profit.toFixed(2)}
          </span>
        </p>
        <p>평균가: ${averagePrice.toFixed(2)}</p>
        <p>총 수량: {totalQuantity}</p>
        <p>
          총 매수금액: ${(averagePrice.toFixed(2) * totalQuantity).toFixed(2)}(
          {calculatedValueT}회)
        </p>
      </div>
      <div className="mb-6">
        <StockTrackerComponent
          ticker={stock.name}
          startDate={earliestTransactionDate}
          transactions={stockTransactions}
        />
      </div>

      <div className="bg-gray-100 p-4 rounded-lg shadow-lg mt-6">
        <h2 className="text-2xl font-semibold" style={{ color: "red" }}>
          매수 가이드
          {stock.quarterCutMode === true &&
            transactionCount - stock.cutModetransactionCounter <= 10 && (
              <span>
                {Array.from(
                  {
                    length:
                      starCounter +
                      1 -
                      (transactionCount - stock.cutModetransactionCounter),
                  },
                  () => "⭐"
                ).join("")}
              </span>
            )}
        </h2>
        {transactionCount > 0 ? (
          <>
            {" "}
            {/* 트랜잭션 있음 */}
            {stock.quarterCutMode === true ? (
              transactionCount - stock.cutModetransactionCounter === 0 ? (
                <>
                  <p>
                    지정 회차를 모두 소진하였습니다. 쿼터모드기간을 시작합니다.
                  </p>
                  <p>오늘은 매수가 없습니다.</p>
                </>
              ) : (
                <>
                  <p>
                    지정 회차를 모두 소진하였습니다. '⭐'일 동안 쿼터모드기간을
                    운영합니다.
                  </p>
                  <p>
                    쿼터모드기간 -{stock.profitGoal}% LOC 매수:{" "}
                    {(averagePrice * (1 - stock.profitGoal / 100)).toFixed(2)} X{" "}
                    {Math.floor(
                      cutModePerTradeAmount /
                        (averagePrice * (1 - stock.profitGoal / 100))
                    )}
                    개
                  </p>
                  <br></br>
                  <h3 style={{ color: "red" }}>하락시 추가 LOC매수</h3>
                  {(() => {
                    const results = [];
                    for (let i = 1; i <= 4; i++) {
                      const totalbuy =
                        (
                          cutModePerTradeAmount /
                          (averagePrice * (1 - stock.profitGoal / 100))
                        ).toFixed(0) + i;
                      results.push(
                        <p key={i}>
                          {(cutModePerTradeAmount / totalbuy).toFixed(2)} X 1개
                        </p>
                      );
                    }
                    return results;
                  })()}
                </>
              )
            ) : perstar >= 0 &&
              (stock.version === "2.2" || stock.version === "3.0") ? (
              <>
                {" "}
                {/* 2.2 전후반전 매수 시작 */}
                <h3 style={{ color: "red", fontWeight: "bold" }}>
                  &lt;전반전 매수&gt;
                </h3>
                <details>
                  <summary>
                    매수 평단 LOC: ${averagePrice.toFixed(2)} X{" "}
                    {(stock.perTradeAmount / averagePrice / 2).toFixed(0)}개
                  </summary>
                  <p>
                    큰수매수(종가112%)LOC: $
                    {(previousClosePrice * 1.12).toFixed(2)} X{" "}
                    {(
                      stock.perTradeAmount /
                      (previousClosePrice * 1.12) /
                      2
                    ).toFixed(0)}
                    개
                  </p>
                </details>
                <p>
                  매수 별{perstar}% LOC: $
                  {(averagePrice * (1 + perstar / 100) - 0.01).toFixed(2)} X{" "}
                  {(
                    stock.perTradeAmount /
                    (averagePrice * (1 + perstar / 100) - 0.01) /
                    2
                  ).toFixed(0)}
                  개
                </p>
                <br></br>
                <h3 style={{ color: "red" }}>하락시 추가 LOC매수</h3>
                {(() => {
                  const results = [];
                  for (let i = 1; i <= 4; i++) {
                    const totalbuy =
                      stock.perTradeAmount / averagePrice / 2 +
                      stock.perTradeAmount /
                        (averagePrice * (1 + perstar / 100) - 0.01) /
                        2 +
                      i;
                    results.push(
                      <p key={i}>
                        ${(stock.perTradeAmount / totalbuy).toFixed(2)} X 1개
                      </p>
                    );
                  }
                  return results;
                })()}
              </>
            ) : (
              <>
                {" "}
                {/* 2.2 후반전 매수 */}
                <h3 style={{ color: "red", fontWeight: "bold" }}>
                  &lt;후반전 매수&gt;
                </h3>
                <p>
                  매수 별{perstar}% LOC: $
                  {(averagePrice * (1 + perstar / 100) - 0.01).toFixed(2)} X{" "}
                  {(
                    stock.perTradeAmount /
                    (averagePrice * (1 + perstar / 100) - 0.01)
                  ).toFixed(0)}
                  개
                </p>
                <br></br>
                <h3 style={{ color: "red" }}>하락시 추가 LOC매수</h3>
                {(() => {
                  const results = [];
                  for (let i = 1; i <= 4; i++) {
                    const totalbuy =
                      Number(
                        (
                          stock.perTradeAmount /
                          (averagePrice * (1 + perstar / 100) - 0.01)
                        ).toFixed(0)
                      ) + i;
                    results.push(
                      <p key={i}>
                        ${(stock.perTradeAmount / totalbuy).toFixed(2)} X 1개
                      </p>
                    );
                  }
                  return results;
                })()}
              </>
            )}
          </>
        ) : (
          <p>입력된 매수 수량이 없습니다.</p>
        )}
        <br />
        <h2 className="text-2xl font-semibold" style={{ color: "blue" }}>
          매도 가이드
        </h2>
        {transactionCount > 0 ? (
          <>
            {stock.quarterCutMode === true ? (
              <>
                {/* quarterCutMode가 시작되었고, transactionCount가 cutModetransactionCounter와 같은 경우 */}
                {transactionCount - stock.cutModetransactionCounter === 0 ? (
                  <>
                    <p>
                      지정 회차를 모두 소진하였습니다. 쿼터모드기간을
                      시작합니다.
                    </p>
                    <p>
                      쿼터모드기간 MOC매도: {Math.floor(totalQuantity / 4)}개
                    </p>
                  </>
                ) : (
                  <>
                    {/* quarterCutMode가 활성화된 상태에서 10개 미만의 트랜잭션이 발생한 경우 */}
                    {transactionCount - stock.cutModetransactionCounter <=
                    10 ? (
                      <>
                        <p>
                          쿼터모드기간 -{stock.profitGoal}% LOC매도: $
                          {(
                            averagePrice *
                            (1 - stock.profitGoal / 100)
                          ).toFixed(2)}{" "}
                          X {Math.floor(totalQuantity / 4)}개
                        </p>
                        <p>
                          쿼터모드기간 {stock.profitGoal}% after지정매도: $
                          {(
                            averagePrice *
                            (1 + stock.profitGoal / 100)
                          ).toFixed(2)}{" "}
                          X {Math.floor(totalQuantity - totalQuantity / 4)}개
                        </p>
                        {/* cutModetransactionCounter가 -1일 때만 업데이트 */}
                        {stock.cutModetransactionCounter === -1 &&
                          (() => {
                            stock.cutModetransactionCounter = transactionCount;
                          })()}
                      </>
                    ) : (
                      <>
                        {/* 10개 이상의 트랜잭션이 발생한 경우 매도 안내 */}
                        {/* cutModetransactionCounter 업데이트 */}
                        {(() => {
                          updateStock(stock.id, {
                            cutModetransactionCounter: transactionCount,
                          });
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
                <p>
                  매도 LOC 별지점 {perstar}%: $
                  {(averagePrice * (1 + perstar / 100)).toFixed(2)} X{" "}
                  {(totalQuantity / 4).toFixed(0)}개
                </p>
                <p>
                  매도 After지정: $
                  {(averagePrice * (1 + stock.profitGoal / 100)).toFixed(2)} X{" "}
                  {(totalQuantity - (totalQuantity / 4).toFixed(0)).toFixed(0)}
                  개
                </p>
              </>
            )}
          </>
        ) : (
          <p>입력된 매수 수량이 없습니다.</p>
        )}
      </div>

      <TransactionList
        stockId={id}
        perstar={perstar}
        averagePrice={averagePrice}
        onAddTransaction={handleTransactionUpdate}
        onDeleteTransaction={handleTransactionUpdate}
        onEarliestDateChange={setEarliestTransactionDate}
      />
    </div>
  );
};

export default StockDetail;
