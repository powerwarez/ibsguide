import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import StockChart from "./StockChart";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const StockTrackerComponent = ({
  ticker,
  startDate,
  transactions,
  endDate,
  useUSTime = false,
}) => {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchYahooData = async (ticker) => {
    console.log(
      `[StockTrackerComponent] Fetching data for ${ticker}...`
    );
    const response = await fetch(
      `/api/v8/finance/chart/${ticker}?interval=1d&range=1y`
    );

    const data = await response.json();

    if (data.chart.error) {
      throw new Error(
        "종가 데이터를 불러오는데 실패했습니다"
      );
    }

    const timestamps = data.chart.result[0].timestamp;
    const closePrices =
      data.chart.result[0].indicators.quote[0].close;
    const adjClosePrices =
      data.chart.result[0].indicators.adjclose?.[0]
        ?.adjclose;

    // 디버깅: 마지막 몇 개 데이터 확인
    if (ticker === "SOXL") {
      const lastIndex = closePrices.length - 1;
      console.log(
        `[StockTrackerComponent] === ${ticker} 최근 데이터 ===`
      );
      for (
        let i = Math.max(0, lastIndex - 2);
        i <= lastIndex;
        i++
      ) {
        if (closePrices[i] !== null) {
          const date = new Date(timestamps[i] * 1000);
          console.log(
            `날짜: ${
              date.toISOString().split("T")[0]
            } (UTC)`
          );
          console.log(`  - 종가(close): ${closePrices[i]}`);
          console.log(
            `  - 조정종가(adjclose): ${
              adjClosePrices?.[i] || "N/A"
            }`
          );
          console.log(
            `  - toFixed(2) 결과: ${closePrices[i].toFixed(
              2
            )}`
          );

          // 미국 동부 시간대로도 확인
          const estDate = new Date(timestamps[i] * 1000);
          estDate.setHours(estDate.getHours() - 5); // EST 시간대 (UTC-5)
          console.log(
            `  - EST 날짜: ${
              estDate.toISOString().split("T")[0]
            }`
          );
        }
      }
    }

    return timestamps.map((timestamp, index) => {
      const date = new Date(timestamp * 1000);
      // UTC 날짜 사용
      return {
        date: date.toISOString().split("T")[0],
        price: closePrices[index]?.toFixed(2) || null,
      };
    });
  };

  const calculateCumulativeAveragePrices = (
    transactions,
    startDate,
    endDate
  ) => {
    let totalQuantity = 0;
    let averagePrice = 0;
    const cumulativePrices = [];

    // 시작 날짜부터 종료 날짜까지의 모든 날짜를 포함하는 배열 생성
    const dateRange = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      dateRange.push(
        new Date(currentDate).toISOString().split("T")[0]
      );
      currentDate.setDate(currentDate.getDate() + 1);
    }

    transactions.forEach((txn) => {
      const date = new Date(txn.date)
        .toISOString()
        .split("T")[0];
      if (txn.type === "매수") {
        const newPurchaseAmount = txn.price * txn.quantity;
        const newTotalQuantity =
          totalQuantity + txn.quantity;
        averagePrice =
          (averagePrice * totalQuantity +
            newPurchaseAmount) /
          newTotalQuantity;
        totalQuantity = newTotalQuantity;
      } else if (txn.type === "매도") {
        totalQuantity += txn.quantity; // 매도 시 총 수량 업데이트
      }

      cumulativePrices.push({
        date,
        averagePrice:
          totalQuantity > 0
            ? averagePrice.toFixed(2)
            : null,
      });
    });

    // 누락된 날짜에 대해 일 균가 유지
    let lastPrice = null;
    const filledCumulativePrices = dateRange.map((date) => {
      const existing = cumulativePrices.find(
        (item) => item.date === date
      );
      if (existing) {
        lastPrice = existing.averagePrice;
        return existing;
      } else {
        return { date, averagePrice: lastPrice };
      }
    });

    return filledCumulativePrices;
  };

  const sellPoints = transactions
    .filter((txn) => txn.type === "매도")
    .map((txn) => ({
      date: new Date(txn.date).toISOString().split("T")[0],
      price: parseFloat(txn.price), // 숫자로 변환
    }));

  const isKoreaMarketOpen = () => {
    const now = new Date();
    const koreaTime = new Date(
      now.toLocaleString("en-US", {
        timeZone: "Asia/Seoul",
      })
    );
    return (
      koreaTime.getHours() > 8 ||
      (koreaTime.getHours() === 8 &&
        koreaTime.getMinutes() >= 30)
    );
  };

  const isSameDate = (date1, date2) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const shouldFetchNew = (latestData) => {
    const now = new Date();
    const koreanTime = new Date(
      now.toLocaleString("en-US", {
        timeZone: "Asia/Seoul",
      })
    );
    return (
      !latestData.length ||
      !isSameDate(
        new Date(latestData[0].updated_at),
        koreanTime
      ) ||
      (isKoreaMarketOpen() &&
        latestData[0].updated_at <
          koreanTime.setHours(8, 30, 0, 0))
    );
  };

  useEffect(() => {
    const loadStockData = async () => {
      try {
        console.log(
          "StockTracker Props - 티커:",
          ticker,
          "시작일:",
          startDate,
          "종료일:",
          endDate
        );

        // 트랜잭션이 없거나 시작일이 없는 경우 처리
        if (
          !transactions ||
          transactions.length === 0 ||
          !startDate
        ) {
          setStockData([]);
          setError(null); // 에러가 아닌 빈 상태로 처리
          setLoading(false);
          return;
        }

        // 티커에서 정산 날짜 추출
        let settledDateFromTicker = null;
        if (ticker.includes("정산")) {
          const match = ticker.match(
            /\((\d{4})년\s(\d{2})월\s(\d{2})일\s정산\)/
          );
          if (match) {
            settledDateFromTicker = `${match[1]}-${match[2]}-${match[3]}`;
          }
        }

        // 미래 날짜 체크 및 처리
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);

        // 시작일이 미래인 경우, 현재 또는 과거 데이터만 표시하기 위해 데이터를 조정
        // 가장 오래된 거래의 전날 종가도 포함하기 위해 startDate에서 하루 더 빼기
        const adjustedStartDate = new Date(startDate);
        adjustedStartDate.setDate(
          adjustedStartDate.getDate() - 1
        );
        const adjustedStartDateStr = adjustedStartDate
          .toISOString()
          .split("T")[0];

        console.log(
          `원래 시작일: ${startDate}, 조정된 시작일: ${adjustedStartDateStr} (전날 종가 포함)`
        );

        const effectiveStartDate =
          startDateObj > today
            ? today.toISOString().split("T")[0]
            : adjustedStartDateStr;

        // 종료일: 1) 티커에서 추출한 정산일, 2) props로 전달받은 endDate, 3) null 순으로 사용
        const rawEndDate = settledDateFromTicker || endDate;

        // 종료일이 미래인 경우(정산된 종목이지만 날짜가 미래인 경우)
        let effectiveEndDate = null;
        if (rawEndDate) {
          const endDateObj = new Date(rawEndDate);
          endDateObj.setHours(0, 0, 0, 0);
          effectiveEndDate =
            endDateObj > today
              ? today.toISOString().split("T")[0]
              : rawEndDate;
        }

        const { data: latestData, error: fetchError } =
          await supabase
            .from("stock_prices")
            .select("*")
            .order("updated_at", { ascending: false })
            .limit(1);

        if (fetchError) throw fetchError;

        const shouldFetch = shouldFetchNew(latestData);

        let stockPrices;

        if (shouldFetch) {
          const [soxlData, tqqqData, qqqData, teclData] =
            await Promise.all([
              fetchYahooData("SOXL"),
              fetchYahooData("TQQQ"),
              fetchYahooData("QQQ"),
              fetchYahooData("TECL"),
            ]);

          stockPrices = {
            SOXL: soxlData,
            TQQQ: tqqqData,
            QQQ: qqqData,
            TECL: teclData,
          };

          const { error: upsertError } = await supabase
            .from("stock_prices")
            .upsert([
              {
                ticker: "SOXL",
                prices: soxlData,
                updated_at: new Date().toISOString(),
              },
              {
                ticker: "TQQQ",
                prices: tqqqData,
                updated_at: new Date().toISOString(),
              },
              {
                ticker: "QQQ",
                prices: qqqData,
                updated_at: new Date().toISOString(),
              },
              {
                ticker: "TECL",
                prices: teclData,
                updated_at: new Date().toISOString(),
              },
            ]);

          if (upsertError) throw upsertError;
        } else {
          const { data: cachedData, error: cacheError } =
            await supabase.from("stock_prices").select("*");

          if (cacheError) throw cacheError;

          stockPrices = cachedData.reduce(
            (acc, curr) => ({
              ...acc,
              [curr.ticker]: curr.prices,
            }),
            {}
          );
        }

        // ticker 이름에서 정산 날짜 부분 제거 (예: "SOXL(2025년 05월 26일 정산)" -> "SOXL")
        const baseTicker = ticker.split("(")[0];
        console.log("실제 조회할 티커:", baseTicker);

        // 정산된 종목인지 확인
        //eslint-disable-next-line
        const isSettled =
          ticker.includes("정산") || rawEndDate !== null;

        // 가장 최근 거래 날짜 찾기
        const latestTransactionDate =
          transactions.length > 0
            ? transactions.reduce((latest, txn) => {
                const txnDate = new Date(txn.date);
                return txnDate > latest ? txnDate : latest;
              }, new Date(transactions[0].date))
            : today;

        const latestTransactionDateStr =
          latestTransactionDate.toISOString().split("T")[0];
        console.log(
          "가장 최근 거래 날짜:",
          latestTransactionDateStr
        );

        // 시작일 이후의 데이터 필터링 - 조정된 시작일 사용
        let filteredData =
          stockPrices[baseTicker]?.filter(
            (data) =>
              new Date(data.date) >=
              new Date(effectiveStartDate)
          ) || [];

        // 종료일이 제공된 경우(정산된 경우) 종료일까지만 표시 - 조정된 종료일 사용
        if (effectiveEndDate) {
          const endDateObj = new Date(effectiveEndDate);
          console.log(
            `종료일 적용: ${effectiveEndDate} (${endDateObj.toISOString()})`
          );

          // 종료일 이전 데이터만 남김 (당일 포함)
          filteredData = filteredData.filter((data) => {
            const dataDate = new Date(data.date);
            dataDate.setHours(0, 0, 0, 0);
            return dataDate <= endDateObj;
          });
        } else {
          // 정산되지 않은 경우, 가장 최근 거래 날짜까지 포함
          filteredData = filteredData.filter((data) => {
            const dataDate = new Date(data.date);
            dataDate.setHours(0, 0, 0, 0);
            return dataDate <= latestTransactionDate;
          });
        }

        // 미래 데이터 필터링 (현재 날짜보다 이후의 데이터는 제외)
        filteredData = filteredData.filter(
          (data) => new Date(data.date) <= today
        );

        // 차트 종료일을 가장 최근 거래일 또는 필터된 데이터의 마지막 날짜 중 더 늦은 날짜로 설정
        const chartEndDate =
          effectiveEndDate ||
          (filteredData.length > 0
            ? new Date(
                filteredData[filteredData.length - 1].date
              ) >= latestTransactionDate
              ? filteredData[filteredData.length - 1].date
              : latestTransactionDateStr
            : latestTransactionDateStr);

        console.log(`차트 종료일: ${chartEndDate}`);

        // 트랜잭션이 하나만 있어도 차트를 표시
        // 모든 거래 날짜를 포함하는 날짜 범위 생성
        const allDates = new Set();

        // 거래 날짜들만 추가 (실제 거래가 있는 날짜만 그래프에 표시)
        transactions.forEach((txn) => {
          const txnDate = new Date(txn.date)
            .toISOString()
            .split("T")[0];
          // 모든 거래 날짜를 포함 (오늘 거래도 포함)
          allDates.add(txnDate);
        });

        // 거래가 있는 날짜 범위 내의 종가 데이터만 추가
        // (첫 거래일부터 마지막 거래일까지)
        if (transactions.length > 0) {
          const firstTxnDate = transactions.reduce(
            (min, txn) => {
              const txnDate = new Date(txn.date);
              return txnDate < min ? txnDate : min;
            },
            new Date(transactions[0].date)
          );

          const lastTxnDate = transactions.reduce(
            (max, txn) => {
              const txnDate = new Date(txn.date);
              return txnDate > max ? txnDate : max;
            },
            new Date(transactions[0].date)
          );

          const firstTxnDateStr = firstTxnDate
            .toISOString()
            .split("T")[0];
          const lastTxnDateStr = lastTxnDate
            .toISOString()
            .split("T")[0];
          console.log(
            `거래 날짜 범위: ${firstTxnDateStr} ~ ${lastTxnDateStr}`
          );

          filteredData.forEach((data) => {
            const dataDate = new Date(data.date);
            // 첫 거래일과 마지막 거래일 사이의 종가 데이터만 추가
            if (
              dataDate >= firstTxnDate &&
              dataDate <= lastTxnDate
            ) {
              allDates.add(data.date);
            }
          });
        }

        // 날짜 정렬
        const sortedDates = Array.from(allDates).sort();

        // sortedDates가 비어있어도 거래 데이터는 표시
        let finalDates = sortedDates;
        if (
          sortedDates.length === 0 &&
          transactions.length > 0
        ) {
          // 거래는 있지만 날짜 데이터가 없는 경우 (모든 거래가 미래 날짜인 경우 등)
          // 거래 날짜만으로 차트 생성
          const txnDates = new Set();
          transactions.forEach((txn) => {
            const txnDate = new Date(txn.date)
              .toISOString()
              .split("T")[0];
            txnDates.add(txnDate);
          });
          finalDates = Array.from(txnDates).sort();
        }

        // 평균가 계산 (모든 거래 포함)
        const cumulativeAveragePrices =
          calculateCumulativeAveragePrices(
            transactions,
            finalDates.length > 0
              ? finalDates[0]
              : effectiveStartDate,
            finalDates.length > 0
              ? finalDates[finalDates.length - 1]
              : chartEndDate
          );

        // 모든 날짜에 대한 데이터 생성
        console.log("Final dates for chart:", finalDates);
        console.log(
          "Filtered stock data count:",
          filteredData.length
        );
        console.log(
          "Filtered data (first 5):",
          filteredData
            .slice(0, 5)
            .map((d) => ({ date: d.date, price: d.price }))
        );

        const combinedData = finalDates.map((date) => {
          // 한국시간 거래날짜에서 미국 종가날짜를 구하기 (하루 전)
          const priceDate = new Date(date);
          priceDate.setDate(priceDate.getDate() - 1);
          const priceDateStr = priceDate
            .toISOString()
            .split("T")[0];

          console.log(
            `거래날짜 ${date} → 종가날짜 ${priceDateStr} 찾기`
          );

          // 주식 가격 데이터 찾기 - 하루 전 날짜로 매칭
          let priceData = filteredData.find(
            (item) => item.date === priceDateStr
          );

          // 날짜에 해당하는 가격 데이터가 없으면 그 이전 날짜의 데이터 사용
          if (!priceData && filteredData.length > 0) {
            // filteredData를 날짜순으로 오름차순 정렬
            const sortedFilteredData = [
              ...filteredData,
            ].sort(
              (a, b) => new Date(a.date) - new Date(b.date)
            );

            // priceDateStr보다 이전 또는 같은 날짜 중 가장 최근 데이터 찾기
            for (
              let i = sortedFilteredData.length - 1;
              i >= 0;
              i--
            ) {
              if (
                new Date(sortedFilteredData[i].date) <=
                new Date(priceDateStr)
              ) {
                console.log(
                  `거래날짜 ${date}에 대해 종가날짜 ${sortedFilteredData[i].date}의 가격 ${sortedFilteredData[i].price} 사용`
                );
                priceData = sortedFilteredData[i];
                break;
              }
            }
          } else if (priceData) {
            console.log(
              `거래날짜 ${date}에 대해 종가날짜 ${priceDateStr}의 정확한 가격 ${priceData.price} 찾음`
            );
          }

          // 평균가 데이터 찾기
          const averagePriceData =
            cumulativeAveragePrices.find(
              (avg) => avg.date === date
            );
          // 매도 포인트 찾기
          const sellPoint = sellPoints.find(
            (sell) => sell.date === date
          );

          return {
            date,
            price: priceData ? priceData.price : null,
            averagePrice: averagePriceData
              ? averagePriceData.averagePrice
              : null,
            sellPrice: sellPoint ? sellPoint.price : null,
          };
        });

        if (combinedData.length === 0) {
          console.warn(
            "차트 데이터가 없습니다. 시작일과 종료일을 확인하세요."
          );
        }

        setStockData(combinedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    console.log("ticker:", ticker);
    loadStockData();
    // eslint-disable-next-line
  }, [ticker, startDate, transactions, endDate]);

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="mb-2">
          데이터를 불러오는 중 입니다...
        </div>
        <div className="text-sm text-gray-500">
          한국시간 아침 7시 5분 이후 데이터가 업데이트
          됩니다.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  // 트랜잭션이 없거나 데이터가 없는 경우
  if (!stockData || stockData.length === 0) {
    return (
      <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">📊</div>
        <p className="text-gray-500 mb-2">
          표시할 데이터가 없습니다
        </p>
        <p className="text-sm text-gray-400">
          거래를 입력하면 차트가 표시됩니다
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <StockChart
        data={stockData}
        ticker={ticker}
        useUSTime={useUSTime}
      />
    </div>
  );
};

export default StockTrackerComponent;
