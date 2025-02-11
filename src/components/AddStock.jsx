import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid"; // UUID 라이브러리

const AddStock = ({ onAdd }) => {
  // compoundInterestRate를 소수(decimal)로 저장 (예: 0.5 = 50%)
  const [compoundInterestRate, setCompoundInterestRate] = useState(0.5);
  const [name, setName] = useState("TQQQ"); // 종목명
  const [version, setVersion] = useState("2.2"); // 투자 버전 선택
  const [investment, setInvestment] = useState(0); // 투자 금액
  const [profitGoal, setProfitGoal] = useState(15); // 수익률
  const [divisionCount, setDivisionCount] = useState(20); // 분할 횟수
  const [perTradeAmount, setPerTradeAmount] = useState(0); // 1회 매수금
  const [profit, setProfit] = useState(0); // 현재 수익
  const [isSettled] = useState(false); // 정산 여부 (초기값 false)
  const [quarterCutMode] = useState(false);
  const [cutModetransactionCounter] = useState(-1);
  const [originalInvestment] = useState(0);

  // 투자 금액과 분할 횟수에 따라 1회 매수금을 계산
  useEffect(() => {
    if (divisionCount > 0) {
      setPerTradeAmount(investment / divisionCount);
      setProfit(0);
    }
  }, [investment, divisionCount]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 새로운 종목 데이터 생성 (compoundInterestRate 필드 추가)
    const newStock = {
      id: uuidv4(), // 고유 ID 생성
      name,
      version,
      investment: parseFloat(investment), // 숫자로 변환
      profitGoal: parseFloat(profitGoal), // 숫자로 변환
      divisionCount: parseInt(divisionCount), // 숫자로 변환
      profit: parseFloat(profit),
      perTradeAmount,
      isSettled, // 정산 여부
      quarterCutMode,
      cutModetransactionCounter,
      originalInvestment,
      compoundInterestRate, // 복리율 추가
    };

    try {
      // 상위 컴포넌트에 newStock 전달
      await onAdd(newStock);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
    }
  };

  // onWheel 이벤트 핸들러 추가하여 마우스 휠 이벤트 방지
  const preventScroll = (e) => e.target.blur();

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 mt-6 rounded-lg shadow-md"
    >
      <h3 className="text-lg font-medium mb-4">운용 종목 추가</h3>

      {/* 종목명 선택 - 라디오 버튼으로 변경 */}
      <label className="block mb-2">종목명:</label>
      <div className="flex items-center mb-4 space-x-4">
        <label className="flex items-center">
          <input
            type="radio"
            value="TQQQ"
            checked={name === "TQQQ"}
            onChange={(e) => setName(e.target.value)}
            className="mr-2"
          />
          TQQQ
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            value="SOXL"
            checked={name === "SOXL"}
            onChange={(e) => setName(e.target.value)}
            className="mr-2"
          />
          SOXL
        </label>
      </div>

      {/* 투자 버전 선택 */}
      <label className="block mb-2">투자 버전:</label>
      <select
        value={version}
        onChange={(e) => setVersion(e.target.value)}
        className="block w-full mb-4 p-2 border rounded"
      >
        <option value="2.2">2.2</option>
        <option value="3.0">3.0</option>
      </select>

      {/* 투자 금액 입력 */}
      <label className="block mb-2">투자 금액($):</label>
      <input
        type="number"
        inputMode="numeric"
        value={investment}
        onChange={(e) => setInvestment(e.target.value)}
        onWheel={preventScroll}
        className="block w-full mb-4 p-2 border rounded"
        min="0"
      />

      {/* 분할 횟수 입력 */}
      <label className="block mb-2">분할 횟수:</label>
      <input
        type="number"
        inputMode="numeric"
        value={divisionCount}
        onChange={(e) => setDivisionCount(e.target.value)}
        onWheel={preventScroll}
        className="block w-full mb-4 p-2 border rounded"
        min="1"
      />

      {/* 1회 매수금 계산 결과 */}
      <label className="block mb-2">1회 매수금($):</label>
      <input
        type="number"
        inputMode="numeric"
        value={perTradeAmount}
        disabled
        className="block w-full mb-4 p-2 border rounded bg-gray-200 cursor-not-allowed"
      />

      {/* 수익률 입력 */}
      <label className="block mb-2">목표 수익률 (%):</label>
      <input
        type="number"
        inputMode="numeric"
        value={profitGoal}
        onChange={(e) => setProfitGoal(e.target.value)}
        onWheel={preventScroll}
        className="block w-full mb-4 p-2 border rounded"
      />

      {version === "3.0" && (
        <>
          {/* 복리율 입력: 사용자가 백분율(%)로 입력하고 내부는 소수로 저장 */}
          <label className="block mb-2">복리율 (%):</label>
          <input
            type="number"
            inputMode="numeric"
            value={(compoundInterestRate * 100).toFixed(0)}
            onChange={(e) =>
              setCompoundInterestRate(parseFloat(e.target.value) / 100)
            }
            onWheel={preventScroll}
            className="block w-full mb-4 p-2 border rounded"
          />
        </>
      )}

      {/* 추가 버튼 */}
      <button
        type="submit"
        className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
      >
        추가
      </button>
    </form>
  );
};

export default AddStock;
