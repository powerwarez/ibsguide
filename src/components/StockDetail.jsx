import React, {
  useEffect,
  useState,
  useCallback,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getStocks,
  getTransactionsByStockId,
  updateStock,
} from "../db";
import TransactionList from "./TransactionList";
import StockTrackerComponent from "./StockTrackerComponent";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const StockDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [averagePrice, setAveragePrice] = useState(0);
  const [perstar, setPerstar] = useState(0);
  const [transactionCount, setTransactionCount] =
    useState(0);
  const [calculatedValueT, setCalculatedValueT] =
    useState(0);
  const [
    earliestTransactionDate,
    setEarliestTransactionDate,
  ] = useState(null);
  const [stockTransactions, setStockTransactions] =
    useState([]);
  const [previousClosePrice, setPreviousClosePrice] =
    useState(null);
  const [lastSellDate, setLastSellDate] = useState(null);

  // NaN 방지 안전 함수들
  const safeDiv = (a, b) => {
    if (!isFinite(a) || !isFinite(b) || b === 0) return 0;
    const result = a / b;
    return isFinite(result) ? result : 0;
  };

  const safeFloor = (value) => {
    if (!isFinite(value) || isNaN(value)) return 0;
    return Math.floor(value);
  };

  const safeMath = (value) => {
    if (!isFinite(value) || isNaN(value) || value <= 0)
      return 0;
    return value;
  };

  const formatSafeValue = (value, isQuantity = false) => {
    if (!isFinite(value) || isNaN(value) || value <= 0) {
      return isQuantity
        ? "총매수금액부족"
        : "총매수금액부족";
    }
    return isQuantity ? value.toString() : value.toFixed(2);
  };

  const loadStockData = useCallback(async () => {
    const storedStocks = await getStocks();
    const foundStock = storedStocks.find(
      (stock) => stock.id === id
    );
    if (foundStock) {
      setStock(foundStock);

      const stockTransactions = (
        await getTransactionsByStockId(id)
      ).sort((a, b) => a.timestamp - b.timestamp);
      setStockTransactions(stockTransactions);
      setTransactionCount(stockTransactions.length);

      let totalQuantity = 0;
      let averagePrice = 0;
      let totalProfit = 0;

      stockTransactions.forEach((txn) => {
        if (txn.type === "매수") {
          const newPurchaseAmount =
            txn.price * txn.quantity;
          const purchaseFee = Number(txn.fee) || 0;
          const newTotalQuantity =
            totalQuantity + txn.quantity;
          // 평균가에 수수료를 포함하여 실제 매수 단가 계산
          averagePrice =
            (averagePrice * totalQuantity +
              newPurchaseAmount +
              purchaseFee) /
            newTotalQuantity;
          totalQuantity = newTotalQuantity;
        } else if (txn.type === "매도") {
          // 현재 매도 거래의 fee
          const saleFee = Number(txn.fee) || 0;
          // 매도 시 수익 계산 (매도 수수료 차감)
          const profitAmount =
            (txn.price - averagePrice) *
              Math.abs(txn.quantity) -
            saleFee;
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
      const valueT =
        investedValue / foundStock.perTradeAmount;
      const roundedInvestedPercentage =
        Math.ceil(valueT * 10) / 10;
      setCalculatedValueT(roundedInvestedPercentage);

      // version에 따라 perstarValue 계산
      const perstarValue =
        foundStock.profitGoal -
        (foundStock.profitGoal /
          (foundStock.divisionCount / 2)) *
          roundedInvestedPercentage;
      setPerstar(perstarValue.toFixed(1));

      await updateStock(id, {
        quantity: totalQuantity,
        averagePrice: averagePrice,
        profit: totalProfit,
      });

      // Supabase에서 전일 종가 가져오기
      // 티커 이름에서 정산 정보 제거 (예: "SOXL(2025년 05월 26일 정산)" -> "SOXL")
      const baseTicker = foundStock.name.split("(")[0];
      const { data: stockData, error } = await supabase
        .from("stock_prices")
        .select("prices")
        .eq("ticker", baseTicker)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error(
          "Error fetching previous close price:",
          error
        );
      } else if (stockData.length > 0) {
        const prices = stockData[0].prices;

        // 디버깅: 마지막 몇 개 가격 데이터 확인
        console.log(
          `=== ${baseTicker} 종가 데이터 확인 ===`
        );
        console.log(
          `전체 가격 데이터 개수: ${prices.length}`
        );

        // 마지막 5개 데이터 확인
        const startIdx = Math.max(0, prices.length - 5);
        for (let i = startIdx; i < prices.length; i++) {
          if (prices[i]) {
            console.log(
              `[${i}] 날짜: ${prices[i].date}, 가격: ${prices[i].price}`
            );
          }
        }

        const lastPrice = prices[prices.length - 1]?.price;
        console.log(`설정될 전일 종가: ${lastPrice}`);

        // 항상 마지막 가격 데이터를 전일 종가로 사용
        setPreviousClosePrice(lastPrice);
      }

      // quarterCutMode가 시작되는 조건을 확인
      if (
        (foundStock.version === "2.2" ||
          foundStock.version === "3.0") &&
        foundStock.divisionCount -
          roundedInvestedPercentage <
          1 &&
        !foundStock.quarterCutMode
      ) {
        await updateStock(id, {
          quarterCutMode: true,
          cutModetransactionCounter:
            stockTransactions.length,
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

      if (
        recentSellCount >= 2 &&
        foundStock.quarterCutMode
      ) {
        await updateStock(id, {
          quarterCutMode: false,
          cutModetransactionCounter: -1,
        });
        await loadStockData();
      }

      // MOC 매도 이후 쿼터컷 모드 종료 조건
      const hasMOCSellTransaction =
        postCutTransactions.some(
          (txn) =>
            txn.type === "매도" &&
            txn.memo &&
            txn.memo.includes("MOC")
        );

      if (
        hasMOCSellTransaction &&
        foundStock.quarterCutMode
      ) {
        await updateStock(id, {
          quarterCutMode: false,
          cutModetransactionCounter: -1,
        });
        await loadStockData();
      }

      // 추가 조건: transactionCount - stock.cutModetransactionCounter === 1일 때 가장 최근 매도 가격 확인
      if (
        foundStock.quarterCutMode === true &&
        transactionCount -
          foundStock.cutModetransactionCounter ===
          1
      ) {
        const lastTransaction =
          stockTransactions[stockTransactions.length - 1];
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

      // 마지막 매도 날짜 계산
      const lastSellTransaction = stockTransactions
        .filter((txn) => txn.type === "매도")
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      // 정산된 종목은 종료일을 설정
      let settledEndDate = null;
      if (foundStock.isSettled && lastSellTransaction) {
        settledEndDate = new Date(
          lastSellTransaction.timestamp
        )
          .toISOString()
          .split("T")[0];
        setLastSellDate(
          new Date(lastSellTransaction.timestamp)
        );
        console.log("마지막 매도 날짜:", settledEndDate);
      } else if (lastSellTransaction) {
        setLastSellDate(
          new Date(lastSellTransaction.timestamp)
        );
      }

      console.log("정산 여부:", foundStock.isSettled);
      console.log(
        "endDate 전달값:",
        foundStock.isSettled ? settledEndDate : "null"
      );
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
        <button
          onClick={() => navigate("/")}
          className="text-2xl font-bold text-gray-700 mr-4">
          &lt;
        </button>
        <h1 className="text-3xl font-bold">
          종목 세부 정보
        </h1>
      </div>
      <div className="p-4 mb-6 bg-gray-100 rounded-lg shadow-md text-center">
        <h2 className="text-xl font-semibold">주의사항</h2>
        <p className="mt-2 text-sm text-gray-500">
          <span className="font-bold text-red-500">
            본 사이트는 무한 매수를 진행하는 분들의 개인적인
            기록이나 계산을 도와주는 사이트입니다.
            <br />
            해당 방법을 추천하거나, 특정종목을 추천하지
            않습니다.
            <br />
            매수매도를 추천하지 않으며, 수익을 보장하지
            않습니다.
            <br />
            투자여부에 대한 모든 판단 및 결정은 투자자
            스스로 하시기 바랍니다.
            <br />본 사이트는 투자자의 투자 결과에 대한
            책임을 지지 않습니다.
          </span>
        </p>
      </div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">
          {stock.name} (v{stock.version})
        </h2>
        <p>총 투자 금액: ${stock.investment.toFixed(2)}</p>
        <p>분할 횟수: {stock.divisionCount}회</p>
        <p>
          1회 매수 금액: ${stock.perTradeAmount.toFixed(2)}
        </p>
        <p>목표 수익률: {stock.profitGoal}%</p>
        <p>
          투자 손익 금액:{" "}
          <span
            style={{
              color: stock.profit > 0 ? "red" : "blue",
            }}>
            ${stock.profit.toFixed(2)}
          </span>
        </p>
        <p>평균가: ${averagePrice.toFixed(2)}</p>
        <p>총 수량: {totalQuantity}</p>
        <p>
          총 매수금액: $
          {(
            averagePrice.toFixed(2) * totalQuantity
          ).toFixed(2)}
          ({calculatedValueT}회)
        </p>
        {stock.compoundInterestRate !== undefined && (
          <p>복리율: {stock.compoundInterestRate * 100}%</p>
        )}
      </div>

      <div className="mb-6">
        {stock.name &&
        earliestTransactionDate &&
        stockTransactions ? (
          <StockTrackerComponent
            ticker={stock.name}
            startDate={earliestTransactionDate}
            transactions={stockTransactions}
            endDate={
              stock.isSettled
                ? lastSellDate
                  ? lastSellDate.toISOString().split("T")[0]
                  : null
                : null
            }
          />
        ) : (
          <div className="flex justify-center items-center space-x-2">
            {/* 회전하는 동그라미 로딩 애니메이션 */}
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p>로딩 중...</p>
          </div>
        )}
      </div>

      <div className="bg-gray-100 p-4 rounded-lg shadow-lg mt-6">
        <h2
          className="text-2xl font-semibold"
          style={{ color: "red" }}>
          매수 가이드
        </h2>
        {transactionCount > 0 ? (
          <>
            {/* 트랜잭션 있음 */}
            {stock.quarterCutMode === true ? (
              <>
                <p>
                  지정 회차를 모두 소진하였습니다.
                  쿼터매도합니다.
                </p>
                <p>오늘은 매수가 없습니다.</p>
              </>
            ) : perstar >= 0 &&
              (stock.version === "2.2" ||
                stock.version === "3.0") ? (
              <>
                {/* 2.2 전후반전 매수 시작 */}
                {(() => {
                  const starPrice = safeMath(
                    averagePrice * (1 + perstar / 100) -
                      0.01
                  );
                  const halfbuyquantity = safeFloor(
                    safeDiv(
                      stock.perTradeAmount,
                      starPrice
                    ) / 2
                  );
                  const aver_buyquantity = safeFloor(
                    safeDiv(
                      stock.perTradeAmount,
                      averagePrice
                    ) - halfbuyquantity
                  );

                  return (
                    <>
                      <h3
                        style={{
                          color: "red",
                          fontWeight: "bold",
                        }}>
                        &lt;전반전 매수&gt;
                      </h3>
                      <p>
                        매수 별{perstar}% LOC: $
                        {formatSafeValue(starPrice)} X{" "}
                        {formatSafeValue(
                          halfbuyquantity,
                          true
                        )}
                        개
                      </p>
                      <details>
                        <summary>
                          {(() => {
                            return null;
                          })()}
                          매수 평단 LOC: $
                          {averagePrice.toFixed(2)} X{" "}
                          {formatSafeValue(
                            aver_buyquantity,
                            true
                          )}
                          개
                        </summary>
                        <p>
                          큰수매수(종가112%)LOC: $
                          {(
                            previousClosePrice * 1.12
                          ).toFixed(2)}{" "}
                          X{" "}
                          {formatSafeValue(
                            safeFloor(
                              safeDiv(
                                stock.perTradeAmount,
                                previousClosePrice * 1.12
                              ) / 2
                            ),
                            true
                          )}
                          개
                        </p>
                        <p>또는 현재가의 110% 지점 매수</p>
                      </details>
                    </>
                  );
                })()}
                <br />
                <h3 style={{ color: "red" }}>
                  하락시 추가 LOC매수
                </h3>
                {(() => {
                  const results = [];
                  const starPrice = safeMath(
                    averagePrice * (1 + perstar / 100) -
                      0.01
                  );
                  const halfbuyquantity = safeFloor(
                    safeDiv(
                      stock.perTradeAmount,
                      starPrice
                    ) / 2
                  );
                  const aver_buyquantity = safeFloor(
                    safeDiv(
                      stock.perTradeAmount,
                      averagePrice
                    ) - halfbuyquantity
                  );

                  for (let i = 1; i <= 4; i++) {
                    const totalbuy = safeMath(
                      aver_buyquantity + halfbuyquantity + i
                    );
                    const pricePerShare = safeDiv(
                      stock.perTradeAmount,
                      totalbuy
                    );
                    results.push(
                      <p key={i}>
                        ${formatSafeValue(pricePerShare)} X
                        1개
                      </p>
                    );
                  }
                  return results;
                })()}
              </>
            ) : (
              <>
                {/* 2.2 후반전 매수 */}
                <h3
                  style={{
                    color: "red",
                    fontWeight: "bold",
                  }}>
                  &lt;후반전 매수&gt;
                </h3>
                <details>
                  <summary>
                    매수 별{perstar}% LOC: $
                    {formatSafeValue(
                      safeMath(
                        averagePrice * (1 + perstar / 100) -
                          0.01
                      )
                    )}{" "}
                    X{" "}
                    {formatSafeValue(
                      safeFloor(
                        safeDiv(
                          stock.perTradeAmount,
                          safeMath(
                            averagePrice *
                              (1 + perstar / 100) -
                              0.01
                          )
                        )
                      ),
                      true
                    )}
                    개
                  </summary>
                  <p>큰 하락시 큰수매수</p>
                  <p>
                    큰수매수(종가112%)LOC: $
                    {(previousClosePrice * 1.12).toFixed(2)}{" "}
                    X{" "}
                    {formatSafeValue(
                      safeFloor(
                        safeDiv(
                          stock.perTradeAmount,
                          previousClosePrice * 1.12
                        )
                      ),
                      true
                    )}
                    개
                  </p>
                  <p>또는 현재가의 110% 지점 매수</p>
                </details>
                <br />
                <h3 style={{ color: "red" }}>
                  하락시 추가 LOC매수
                </h3>
                {(() => {
                  const results = [];
                  const starPrice = safeMath(
                    averagePrice * (1 + perstar / 100) -
                      0.01
                  );
                  for (let i = 1; i <= 4; i++) {
                    const totalbuy = safeMath(
                      safeFloor(
                        safeDiv(
                          stock.perTradeAmount,
                          starPrice
                        ) + i
                      )
                    );
                    const pricePerShare = safeDiv(
                      stock.perTradeAmount,
                      totalbuy
                    );
                    results.push(
                      <p key={i}>
                        ${formatSafeValue(pricePerShare)} X
                        1개
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
        <h2
          className="text-2xl font-semibold"
          style={{ color: "blue" }}>
          매도 가이드
        </h2>
        {transactionCount > 0 ? (
          <>
            {stock.quarterCutMode === true ? (
              <>
                <p>
                  지정 회차를 모두 소진하였습니다.
                  쿼터매도합니다.
                </p>
                <p>
                  쿼터 MOC매도:{" "}
                  {Math.floor(totalQuantity / 4)}개
                </p>
              </>
            ) : (
              <>
                {/* quarterCutMode가 비활성화된 상태의 일반 매도 안내 */}
                <p>
                  매도 LOC 별지점 {perstar}%: $
                  {(
                    averagePrice *
                    (1 + perstar / 100)
                  ).toFixed(2)}{" "}
                  X {Math.floor(totalQuantity / 4)}개
                </p>
                <p>
                  매도 After지정: $
                  {(
                    averagePrice *
                    (1 + stock.profitGoal / 100)
                  ).toFixed(2)}{" "}
                  X{" "}
                  {totalQuantity -
                    Math.floor(totalQuantity / 4)}
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
        calculatedValueT={calculatedValueT}
        totalQuantity={totalQuantity}
        onAddTransaction={handleTransactionUpdate}
        onDeleteTransaction={handleTransactionUpdate}
        onEarliestDateChange={setEarliestTransactionDate}
      />
    </div>
  );
};

export default StockDetail;
