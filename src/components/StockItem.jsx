import React from "react";
import { FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const StockItem = ({ stock, onDelete }) => {
  const navigate = useNavigate();

  // 비율 계산 (investment 대비 보유 자산 비율)
  const investedValue = stock.averagePrice * stock.quantity;
  const valueT = investedValue / stock.perTradeAmount;
  const roundedInvestedPercentage = Math.ceil(valueT * 10) / 10; // 소수 둘째 자리에서 올림

  // StockItem 클릭 시 세부 페이지로 이동
  const handleItemClick = () => {
    navigate(`/stock-detail/${stock.id}`);
  };

  // 삭제 버튼 클릭 시
  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm("이 종목을 삭제하시겠습니까?")) {
      onDelete(stock.id);
    }
  };

  return (
    <div
      className="p-4 bg-gray-100 rounded-lg shadow-md flex justify-between items-center cursor-pointer hover:bg-gray-200"
      onClick={handleItemClick}
    >
      <div>
        <h2 className="text-xl font-semibold">
          {stock.name} (v{stock.version})
        </h2>
        <p>투자 금액: ${stock.investment.toFixed(2)}</p>
        <p>분할 횟수: {stock.divisionCount}회</p> {/* 분할 횟수 표시 */}
        <p>목표 수익률: {stock.profitGoal}%</p>
        {stock.compoundInterestRate != null && (
          <p>복리율: {stock.compoundInterestRate * 100}%</p>
        )}
        <p>1회 매수금: ${stock.perTradeAmount.toFixed(2)}</p>
        <p>
          투자 손익:{" "}
          <span
            className={stock.profit >= 0 ? "text-red-600" : "text-blue-600"}
          >
            ${stock.profit.toFixed(2)}
          </span>
        </p>
        {/* 투자 비율 Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-sm text-gray-700 mb-1">
            <span>
              T값:{" "}
              {roundedInvestedPercentage > 0 ? roundedInvestedPercentage : 0}{" "}
            </span>
          </div>
          <div className="w-full bg-gray-300 rounded h-4 overflow-hidden">
            <div
              style={{
                width: `${
                  (roundedInvestedPercentage / stock.divisionCount) * 100
                }%`,
              }}
              className="h-full bg-green-500"
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            보유 자산 / 총투자: $
            {investedValue.toFixed(2) > 0 ? investedValue.toFixed(2) : 0} / ${stock.investment.toFixed(2)}
          </p>
        </div>
      </div>

      {/* 휴지통 아이콘 */}
      <div
        className="text-red-500 cursor-pointer flex justify-center items-center w-10 h-10 bg-red-100 rounded-full"
        onClick={handleDelete}
      >
        <FaTrash className="text-2xl" />
      </div>
    </div>
  );
};

export default StockItem;
