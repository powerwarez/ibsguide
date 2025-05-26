import React from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Scatter,
  ReferenceLine,
} from "recharts";

const StockChart = ({ data, ticker }) => {
  // 티커 이름에서 정산 정보 추출
  const isSettled = ticker.includes("정산");
  const displayTicker = ticker.split("(")[0]; // 순수 티커만 표시

  // 티커 이름에서 정산 날짜 추출 (예: "TQQQ(2025년 05월 26일 정산)" -> "2025-05-26")
  let extractedSettlementDate = null;
  if (isSettled) {
    const match = ticker.match(/\((\d{4})년\s(\d{2})월\s(\d{2})일\s정산\)/);
    if (match) {
      extractedSettlementDate = `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  console.log("추출된 정산일:", extractedSettlementDate);

  // 데이터가 없는 경우 표시할 메시지
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-2">
          해당 기간에 표시할 데이터가 없습니다.
        </p>
        {isSettled && (
          <p className="text-sm text-blue-500">
            정산 완료된 종목입니다: {displayTicker}
            {extractedSettlementDate && ` (정산일: ${extractedSettlementDate})`}
          </p>
        )}
      </div>
    );
  }

  // 실제 데이터가 있는 경우(null이 아닌 값이 하나라도 있는 경우)
  const hasValidPriceData = data.some((item) => item.price !== null);

  if (!hasValidPriceData) {
    return (
      <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-2">
          {displayTicker}의 가격 데이터를 불러올 수 없습니다.
        </p>
        {isSettled ? (
          <p className="text-sm text-blue-500">
            이 종목은 정산 완료되었습니다.
            {extractedSettlementDate && ` (정산일: ${extractedSettlementDate})`}
          </p>
        ) : (
          <p className="text-sm">
            이 종목은 미래 날짜에 생성되었을 수 있습니다.
          </p>
        )}
      </div>
    );
  }

  // 마지막 매도 포인트 찾기 (차트에 정산 라인 표시용)
  const sellPoints = data.filter((d) => d.sellPrice !== null);

  // 티커에서 추출한 정산일과 일치하는 매도 포인트를 찾거나 마지막 매도 포인트 사용
  let settlementPoint = null;

  if (extractedSettlementDate) {
    // 티커에서 추출한 정산일과 일치하는 매도 포인트 찾기
    settlementPoint = sellPoints.find(
      (p) => p.date === extractedSettlementDate
    );
  }

  // 찾지 못한 경우 마지막 매도 포인트 사용
  if (!settlementPoint && sellPoints.length > 0) {
    settlementPoint = sellPoints[sellPoints.length - 1];
  }

  // 정산일 표시
  const settlementDate =
    extractedSettlementDate || (settlementPoint ? settlementPoint.date : null);

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow">
      {isSettled && (
        <div className="text-sm text-blue-500 mb-2 text-center">
          {displayTicker} 정산 완료된 종목입니다
          {settlementDate && ` (정산일: ${settlementDate})`}
        </div>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" domain={["auto", "auto"]} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#8884d8"
            dot={false}
            yAxisId="left"
            name="가격"
          />
          <Line
            type="monotone"
            dataKey="averagePrice"
            stroke="#82ca9d"
            dot={false}
            yAxisId="left"
            name="평균가"
          />
          <Scatter
            dataKey="sellPrice"
            fill="red"
            shape="circle"
            yAxisId="left"
            name="매도 가격"
          />
          {isSettled && settlementDate && (
            <ReferenceLine
              x={settlementDate}
              stroke="red"
              strokeDasharray="3 3"
              label={{ value: "정산일", position: "top", fill: "red" }}
              yAxisId="left"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
