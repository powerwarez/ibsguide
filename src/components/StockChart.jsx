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

const StockChart = ({
  data,
  ticker,
  useUSTime = false,
}) => {
  // 한국시간을 미국시간으로 변환 (표시용)
  const toUSDateDisplay = (dateString) => {
    if (!dateString || !useUSTime) return dateString;
    const date = new Date(dateString);
    // 한국시간 기준 하루 전날로 표시 (미국 시장 기준)
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0];
  };
  // 티커 이름에서 정산 정보 추출
  const isSettled = ticker.includes("정산");
  const displayTicker = ticker.split("(")[0]; // 순수 티커만 표시

  // 티커 이름에서 정산 날짜 추출 (예: "TQQQ(2025년 05월 26일 정산)" -> "2025-05-26")
  let extractedSettlementDate = null;
  if (isSettled) {
    const match = ticker.match(
      /\((\d{4})년\s(\d{2})월\s(\d{2})일\s정산\)/
    );
    if (match) {
      extractedSettlementDate = `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  console.log("추출된 정산일:", extractedSettlementDate);

  // 데이터가 없는 경우 표시할 메시지
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">📊</div>
        <p className="text-gray-500 mb-2">
          표시할 데이터가 없습니다
        </p>
        {isSettled ? (
          <p className="text-sm text-blue-500">
            정산 완료된 종목입니다: {displayTicker}
            {extractedSettlementDate &&
              ` (정산일: ${extractedSettlementDate})`}
          </p>
        ) : (
          <p className="text-sm text-gray-400">
            거래를 입력하면 차트가 표시됩니다
          </p>
        )}
      </div>
    );
  }

  // 실제 데이터가 있는 경우(price, averagePrice, sellPrice 중 하나라도 있는 경우)
  const hasValidData = data.some(
    (item) =>
      item.price !== null ||
      item.averagePrice !== null ||
      item.sellPrice !== null
  );

  if (!hasValidData) {
    return (
      <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-2">
          {displayTicker}의 데이터를 불러올 수 없습니다.
        </p>
        {isSettled ? (
          <p className="text-sm text-blue-500">
            이 종목은 정산 완료되었습니다.
            {extractedSettlementDate &&
              ` (정산일: ${extractedSettlementDate})`}
          </p>
        ) : (
          <p className="text-sm text-gray-400">
            데이터를 확인하는 중입니다.
          </p>
        )}
      </div>
    );
  }

  // 마지막 매도 포인트 찾기 (차트에 정산 라인 표시용)
  const sellPoints = data.filter(
    (d) => d.sellPrice !== null
  );

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
    extractedSettlementDate ||
    (settlementPoint ? settlementPoint.date : null);

  // 미국시간 옵션에 따라 데이터 변환
  const displayData = useUSTime
    ? data.map((item) => ({
        ...item,
        originalDate: item.date,
        date: toUSDateDisplay(item.date),
        displayDate: toUSDateDisplay(item.date).substring(
          5
        ), // MM-DD 형식으로 표시
      }))
    : data.map((item) => ({
        ...item,
        originalDate: item.date,
        displayDate: item.date.substring(5), // MM-DD 형식으로 표시
      }));

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow">
      {isSettled && (
        <div className="text-sm text-blue-500 mb-2 text-center">
          {displayTicker} 정산 완료된 종목입니다
          {settlementDate &&
            ` (정산일: ${toUSDateDisplay(settlementDate)})`}
        </div>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={displayData}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 12 }}
            label={
              useUSTime
                ? {
                    value: "(미국시간)",
                    position: "insideBottomRight",
                    offset: -5,
                  }
                : null
            }
          />
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
              x={
                useUSTime
                  ? toUSDateDisplay(
                      settlementDate
                    ).substring(5)
                  : settlementDate.substring(5)
              }
              stroke="red"
              strokeDasharray="3 3"
              label={{
                value: "정산일",
                position: "top",
                fill: "red",
              }}
              yAxisId="left"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
