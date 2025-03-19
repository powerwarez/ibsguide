import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ComposedChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Scatter } from 'recharts';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const StockChart = ({ data, ticker }) => {
    return (
      <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart 
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
            />
            <YAxis yAxisId="left" domain={['auto', 'auto']} />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="price"
              stroke="#8884d8" 
              dot={false}
              yAxisId="left"
            />
            <Line 
              type="monotone" 
              dataKey="averagePrice" 
              stroke="#82ca9d" 
              dot={false}
              yAxisId="left"
            />
            <Scatter
              dataKey="sellPrice"
              fill="red"
              shape="circle"
              yAxisId="left"
              name="Sell Price"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

const StockTrackerComponent = ({ ticker, startDate, transactions }) => {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchYahooData = async (ticker) => {
    const response = await fetch(
      `/api/v8/finance/chart/${ticker}?interval=1d&range=1y`
    );

    const data = await response.json();

    if (data.chart.error) {
      throw new Error('종가 데이터를 불러오는데 실패했습니다');
    }

    const timestamps = data.chart.result[0].timestamp;
    const closePrices = data.chart.result[0].indicators.quote[0].close;

    return timestamps.map((timestamp, index) => {
      const date = new Date(timestamp * 1000);
      // UTC 날짜 사용
      return {
        date: date.toISOString().split('T')[0],
        price: closePrices[index]?.toFixed(2) || null
      };
    });
  };

  const calculateCumulativeAveragePrices = (transactions, startDate, endDate) => {
    let totalQuantity = 0;
    let averagePrice = 0;
    const cumulativePrices = [];

    // 시작 날짜부터 종료 날짜까지의 모든 날짜를 포함하는 배열 생성
    const dateRange = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      dateRange.push(new Date(currentDate).toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    transactions.forEach(txn => {
      const date = new Date(txn.date).toISOString().split('T')[0];
      if (txn.type === '매수') {
        const newPurchaseAmount = txn.price * txn.quantity;
        const newTotalQuantity = totalQuantity + txn.quantity;
        averagePrice = ((averagePrice * totalQuantity) + newPurchaseAmount) / newTotalQuantity;
        totalQuantity = newTotalQuantity;
      } else if (txn.type === '매도') {
        totalQuantity += txn.quantity; // 매도 시 총 수량 업데이트
      }

      cumulativePrices.push({ date, averagePrice: totalQuantity > 0 ? averagePrice.toFixed(2) : null });
    });

    // 누락된 날짜에 대해 일 균가 유지
    let lastPrice = null;
    const filledCumulativePrices = dateRange.map(date => {
      const existing = cumulativePrices.find(item => item.date === date);
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
    .filter(txn => txn.type === '매도')
    .map(txn => ({
      date: new Date(txn.date).toISOString().split('T')[0],
      price: parseFloat(txn.price) // 숫자로 변환
    }));

  const shouldFetchNew = (latestData) => {
    const now = new Date();
    const utcNow = new Date(now.toISOString());
    const latestUpdate = new Date(latestData[0].updated_at);

    // UTC 기준으로 자정 이후에 업데이트
    return !latestData.length || 
           utcNow.getUTCDate() !== latestUpdate.getUTCDate();
  };

  useEffect(() => {
    const loadStockData = async () => {
      try {
        const { data: latestData, error: fetchError } = await supabase
          .from('stock_prices')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        const shouldFetch = shouldFetchNew(latestData);

        let stockPrices;

        if (shouldFetch) {
          const [soxlData, tqqqData, qqqData] = await Promise.all([
            fetchYahooData('SOXL'),
            fetchYahooData('TQQQ'),
            fetchYahooData('QQQ')
          ]);

          stockPrices = {
            SOXL: soxlData,
            TQQQ: tqqqData,
            QQQ: qqqData
          };

          const { error: upsertError } = await supabase
            .from('stock_prices')
            .upsert([
              {
                ticker: 'SOXL',
                prices: soxlData,
                updated_at: new Date().toISOString()
              },
              {
                ticker: 'TQQQ',
                prices: tqqqData,
                updated_at: new Date().toISOString()
              },
              {
                ticker: 'QQQ',
                prices: qqqData,
                updated_at: new Date().toISOString()
              }
            ]);

          if (upsertError) throw upsertError;
        } else {
          const { data: cachedData, error: cacheError } = await supabase
            .from('stock_prices')
            .select('*');

          if (cacheError) throw cacheError;

          stockPrices = cachedData.reduce((acc, curr) => ({
            ...acc,
            [curr.ticker]: curr.prices
          }), {});
        }

        const filteredData = stockPrices[ticker]?.filter(data => new Date(data.date) >= new Date(startDate)) || [];

        const endDate = filteredData.length > 0 ? filteredData[filteredData.length - 1].date : new Date().toISOString().split('T')[0];

        const cumulativeAveragePrices = calculateCumulativeAveragePrices(transactions, startDate, endDate);

        const combinedData = filteredData.map(item => {
          const averagePriceData = cumulativeAveragePrices.find(avg => avg.date === item.date);
          const sellPoint = sellPoints.find(sell => sell.date === item.date);
          return {
            ...item,
            averagePrice: averagePriceData ? averagePriceData.averagePrice : null,
            sellPrice: sellPoint ? sellPoint.price : null
          };
        });

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
  }, [ticker, startDate, transactions]);

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
      <StockChart data={stockData} ticker={ticker} sellPoints={sellPoints} />
    </div>
  );
};

export default StockTrackerComponent; 