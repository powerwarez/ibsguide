import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'; // UUID 라이브러리

const AddStock = ({ onAdd }) => {
  const [name, setName] = useState('TQQQ'); // 종목명
  const [version, setVersion] = useState('2.2'); // 투자 버전 선택
  const [investment, setInvestment] = useState(0); // 투자 금액
  const [profitGoal, setProfitGoal] = useState(0); // 수익률
  const [divisionCount, setDivisionCount] = useState(1); // 분할 횟수
  const [perTradeAmount, setPerTradeAmount] = useState(0); // 1회 매수금
  const [profit, setProfit] = useState(0); // 현재 수익
  const [isSettled] = useState(false); // 정산 여부 (초기값 false)

  // 투자 금액과 분할 횟수에 따라 1회 매수금을 계산
  useEffect(() => {
    if (divisionCount > 0) {
      setPerTradeAmount(investment / divisionCount);
      setProfit(0);
    }
  }, [investment, divisionCount]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 새로운 종목 데이터 생성
    const newStock = { 
      id: uuidv4(), // 고유 ID 생성
      name, 
      version, 
      investment: parseFloat(investment), // 숫자로 변환
      profitGoal: parseFloat(profitGoal), // 숫자로 변환
      divisionCount: parseInt(divisionCount), // 숫자로 변환
      profit: parseFloat(profit),
      perTradeAmount,
      isSettled // 정산 여부
    };
    
    try {
      // 상위 컴포넌트에 newStock 전달
      await onAdd(newStock);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 mt-6 rounded-lg shadow-md">
      <h3 className="text-lg font-medium mb-4">운용 종목 추가</h3>

      {/* 종목명 선택 */}
      <label className="block mb-2">종목명:</label>
      <select
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="block w-full mb-4 p-2 border rounded"
      >
        <option value="TQQQ">TQQQ</option>
        <option value="SOXL">SOXL</option>
      </select>

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
      <label className="block mb-2">투자 금액 (달러):</label>
      <input
        type="number"
        value={investment}
        onChange={(e) => setInvestment(e.target.value)}
        className="block w-full mb-4 p-2 border rounded"
        min="0"
      />

      {/* 분할 횟수 입력 */}
      <label className="block mb-2">분할 횟수:</label>
      <input
        type="number"
        value={divisionCount}
        onChange={(e) => setDivisionCount(e.target.value)}
        className="block w-full mb-4 p-2 border rounded"
        min="1"
      />

      {/* 1회 매수금 계산 결과 */}
      <label className="block mb-2">1회 매수금 (달러):</label>
      <input
        type="number"
        value={perTradeAmount}
        disabled
        className="block w-full mb-4 p-2 border rounded bg-gray-200 cursor-not-allowed"
      />

      {/* 수익률 입력 */}
      <label className="block mb-2">수익률 (%):</label>
      <input
        type="number"
        value={profitGoal}
        onChange={(e) => setProfitGoal(e.target.value)}
        className="block w-full mb-4 p-2 border rounded"
      />

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