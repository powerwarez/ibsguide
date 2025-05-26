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
}) => {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchYahooData = async (ticker) => {
    const response = await fetch(
      `/api/v8/finance/chart/${ticker}?interval=1d&range=1y`
    );

    const data = await response.json();

    if (data.chart.error) {
      throw new Error("종가 데이터를 불러오는데 실패했습니다");
    }

    const timestamps = data.chart.result[0].timestamp;
    const closePrices = data.chart.result[0].indicators.quote[0].close;

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
      dateRange.push(new Date(currentDate).toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    transactions.forEach((txn) => {
      const date = new Date(txn.date).toISOString().split("T")[0];
      if (txn.type === "매수") {
        const newPurchaseAmount = txn.price * txn.quantity;
        const newTotalQuantity = totalQuantity + txn.quantity;
        averagePrice =
          (averagePrice * totalQuantity + newPurchaseAmount) / newTotalQuantity;
        totalQuantity = newTotalQuantity;
      } else if (txn.type === "매도") {
        totalQuantity += txn.quantity; // 매도 시 총 수량 업데이트
      }

      cumulativePrices.push({
        date,
        averagePrice: totalQuantity > 0 ? averagePrice.toFixed(2) : null,
      });
    });

    // 누락된 날짜에 대해 일 균가 유지
    let lastPrice = null;
    const filledCumulativePrices = dateRange.map((date) => {
      const existing = cumulativePrices.find((item) => item.date === date);
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

  const shouldFetchNew = (latestData) => {
    const now = new Date();
    const utcNow = new Date(now.toISOString());
    const latestUpdate = new Date(latestData[0].updated_at);

    // UTC 기준으로 자정 이후에 업데이트
    return (
      !latestData.length || utcNow.getUTCDate() !== latestUpdate.getUTCDate()
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

        // 티커에서 정산 날짜 추출
        let settledDateFromTicker = null;
        if (ticker.includes("정산")) {
          const match = ticker.match(
            /\((\d{4})년\s(\d{2})월\s(\d{2})일\s정산\)/
          );
          if (match) {
            settledDateFromTicker = `${match[1]}-${match[2]}-${match[3]}`;
            console.log("티커에서 추출한 정산일:", settledDateFromTicker);
          }
        }

        // 미래 날짜 체크 및 처리
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);

        // 시작일이 미래인 경우, 현재 또는 과거 데이터만 표시하기 위해 데이터를 조정
        const effectiveStartDate =
          startDateObj > today ? today.toISOString().split("T")[0] : startDate;

        // 종료일: 1) 티커에서 추출한 정산일, 2) props로 전달받은 endDate, 3) null 순으로 사용
        const rawEndDate = settledDateFromTicker || endDate;

        // 종료일이 미래인 경우(정산된 종목이지만 날짜가 미래인 경우)
        let effectiveEndDate = null;
        if (rawEndDate) {
          const endDateObj = new Date(rawEndDate);
          endDateObj.setHours(0, 0, 0, 0);
          effectiveEndDate =
            endDateObj > today ? today.toISOString().split("T")[0] : rawEndDate;
        }

        console.log(
          "조정된 시작일:",
          effectiveStartDate,
          "조정된 종료일:",
          effectiveEndDate,
          "티커에서 추출한 정산일:",
          settledDateFromTicker
        );

        const { data: latestData, error: fetchError } = await supabase
          .from("stock_prices")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        const shouldFetch = shouldFetchNew(latestData);

        let stockPrices;

        if (shouldFetch) {
          const [soxlData, tqqqData, qqqData, teclData] = await Promise.all([
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
          const { data: cachedData, error: cacheError } = await supabase
            .from("stock_prices")
            .select("*");

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
        const isSettled = ticker.includes("정산") || rawEndDate !== null;
        console.log("정산된 종목:", isSettled);

        // 시작일 이후의 데이터 필터링 - 조정된 시작일 사용
        let filteredData =
          stockPrices[baseTicker]?.filter(
            (data) => new Date(data.date) >= new Date(effectiveStartDate)
          ) || [];

        console.log(
          `데이터 필터링 전 개수: ${stockPrices[baseTicker]?.length || 0}`
        );
        console.log(`시작일 이후 데이터 개수: ${filteredData.length}`);

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

          console.log(`종료일 이전 데이터 개수: ${filteredData.length}`);
        } else if (isSettled) {
          // 티커에 정산 정보가 있지만 endDate가 없는 경우
          console.log(
            "티커 이름에 정산 정보가 있지만 endDate가 제공되지 않았습니다."
          );
        }

        // 미래 데이터 필터링 (현재 날짜보다 이후의 데이터는 제외)
        filteredData = filteredData.filter(
          (data) => new Date(data.date) <= today
        );
        console.log(`현재 날짜 이전 데이터 개수: ${filteredData.length}`);

        const chartEndDate =
          effectiveEndDate ||
          (filteredData.length > 0
            ? filteredData[filteredData.length - 1].date
            : today.toISOString().split("T")[0]);

        console.log(`차트 종료일: ${chartEndDate}`);

        // 데이터가 없는 경우 빈 차트 데이터 생성 (에러 방지)
        if (filteredData.length === 0) {
          setStockData([
            {
              date: effectiveStartDate,
              price: null,
              averagePrice: null,
              sellPrice: null,
            },
          ]);
          setError("해당 기간에 표시할 주식 데이터가 없습니다.");
          setLoading(false);
          return;
        }

        const cumulativeAveragePrices = calculateCumulativeAveragePrices(
          transactions,
          effectiveStartDate,
          chartEndDate
        );

        const combinedData = filteredData.map((item) => {
          const averagePriceData = cumulativeAveragePrices.find(
            (avg) => avg.date === item.date
          );
          const sellPoint = sellPoints.find((sell) => sell.date === item.date);
          return {
            ...item,
            averagePrice: averagePriceData
              ? averagePriceData.averagePrice
              : null,
            sellPrice: sellPoint ? sellPoint.price : null,
          };
        });

        console.log(`최종 데이터 개수: ${combinedData.length}`);
        if (combinedData.length === 0) {
          console.warn("차트 데이터가 없습니다. 시작일과 종료일을 확인하세요.");
          setError("차트 데이터가 없습니다. 시작일과 종료일을 확인하세요.");
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
        <div className="mb-2">데이터를 불러오는 중 입니다...</div>
        <div className="text-sm text-gray-500">
          한국시간 아침 9:00 이후 데이터가 업데이트 됩니다.
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <StockChart data={stockData} ticker={ticker} />
    </div>
  );
};

export default StockTrackerComponent;
