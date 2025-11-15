// StockTracker.jsx
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// StockChart 컴포넌트
const StockChart = ({ data, ticker }) => {
  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        {ticker}
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#8884d8"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// 메인 컴포넌트
const StockTracker = () => {
  const [stockData, setStockData] = useState({
    SOXL: [],
    TQQQ: [],
    QQQ: [],
    TECL: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const fetchYahooData = async (ticker) => {
    console.log(`Fetching data for ${ticker}...`);
    const response = await fetch(
      `/api/v8/finance/chart/${ticker}?interval=1d&range=1y`
    );
    const data = await response.json();

    if (data.chart.error) {
      throw new Error("Failed to fetch stock data");
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
      console.log(`=== ${ticker} 최근 데이터 ===`);
      console.log(`총 데이터 개수: ${closePrices.length}`);

      // API 응답 전체 구조 확인
      console.log(
        `API 응답 indicators:`,
        data.chart.result[0].indicators
      );

      for (
        let i = Math.max(0, lastIndex - 4);
        i <= lastIndex;
        i++
      ) {
        if (closePrices[i] !== null) {
          const date = new Date(timestamps[i] * 1000);
          const localDate = date.toLocaleDateString(
            "ko-KR",
            { timeZone: "America/New_York" }
          );

          console.log(`\n인덱스 [${i}]:`);
          console.log(
            `  - UTC 날짜: ${date.toISOString()}`
          );
          console.log(
            `  - ISO 날짜: ${
              date.toISOString().split("T")[0]
            }`
          );
          console.log(`  - 뉴욕 시간 날짜: ${localDate}`);
          console.log(
            `  - 원본 종가(close): ${closePrices[i]}`
          );
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
          console.log(
            `  - Math.round(x*100)/100: ${
              Math.round(closePrices[i] * 100) / 100
            }`
          );

          // 2025년 8월 22일 데이터 특별 확인
          if (
            date.toISOString().split("T")[0] ===
            "2025-08-22"
          ) {
            console.log(`\n⚠️ 2025-08-22 데이터 발견!`);
            console.log(`  실제 종가: 27.45`);
            console.log(`  API 반환값: ${closePrices[i]}`);
            console.log(
              `  저장될 값: ${closePrices[i].toFixed(2)}`
            );
          }
        }
      }

      // Open, High, Low 가격도 확인
      const openPrices =
        data.chart.result[0].indicators.quote[0].open;
      const highPrices =
        data.chart.result[0].indicators.quote[0].high;
      const lowPrices =
        data.chart.result[0].indicators.quote[0].low;
      const volumes =
        data.chart.result[0].indicators.quote[0].volume;

      console.log(`\n마지막 거래일 OHLCV 데이터:`);
      console.log(`  - Open: ${openPrices[lastIndex]}`);
      console.log(`  - High: ${highPrices[lastIndex]}`);
      console.log(`  - Low: ${lowPrices[lastIndex]}`);
      console.log(`  - Close: ${closePrices[lastIndex]}`);
      console.log(`  - Volume: ${volumes[lastIndex]}`);
    }

    return timestamps.map((timestamp, index) => ({
      date: new Date(timestamp * 1000)
        .toISOString()
        .split("T")[0],
      price: closePrices[index]?.toFixed(2) || null,
    }));
  };

  useEffect(() => {
    const loadStockData = async () => {
      try {
        // Supabase에서 최신 데이터 확인
        const { data: latestData, error: fetchError } =
          await supabase
            .from("stock_prices")
            .select("*")
            .order("updated_at", { ascending: false })
            .limit(1);

        if (fetchError) throw fetchError;

        const now = new Date();
        const koreanTime = new Date(
          now.toLocaleString("en-US", {
            timeZone: "Asia/Seoul",
          })
        );
        const shouldFetchNew =
          !latestData.length ||
          !isSameDate(
            new Date(latestData[0].updated_at),
            koreanTime
          ) ||
          (isKoreaMarketOpen() &&
            latestData[0].updated_at <
              koreanTime.setHours(8, 30, 0, 0));

        let stockPrices;

        if (shouldFetchNew) {
          // 새로운 데이터 fetch
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

          // Supabase 업데이트
          const { error: upsertError } = await supabase
            .from("stock_prices")
            .upsert([
              {
                ticker: "SOXL",
                prices: soxlData,
              },
              {
                ticker: "TQQQ",
                prices: tqqqData,
              },
              {
                ticker: "QQQ",
                prices: qqqData,
              },
              {
                ticker: "TECL",
                prices: teclData,
              },
            ]);

          if (upsertError) throw upsertError;
        } else {
          // Supabase의 캐시된 데이터 사용
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

        setStockData(stockPrices);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadStockData();
  }, []);

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="mb-2">
          전일 종가 데이터를 불러오고 있습니다...
        </div>
        <div className="text-sm text-gray-500">
          전일 종가는 아침 8시 30분 이후에 업데이트 됩니다.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">
        Stock Price Tracker
      </h1>
      <div className="space-y-6">
        {Object.entries(stockData).map(([ticker, data]) => (
          <StockChart
            key={ticker}
            data={data}
            ticker={ticker}
          />
        ))}
      </div>
    </div>
  );
};

export default StockTracker;
