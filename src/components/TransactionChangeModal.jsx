import React from "react";

const TransactionChangeModal = ({
  changes,
  onClose,
  transactionType,
  stock,
}) => {
  // 변화량에 따른 색상 함수
  const getChangeColor = (change) => {
    return change > 0
      ? "text-red-600"
      : change < 0
      ? "text-blue-600"
      : "text-gray-600";
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="p-6 rounded-lg shadow-xl bg-white max-w-md mx-auto">
        <h2
          className={`text-xl font-bold mb-4 ${
            transactionType === "매수" ? "text-red-600" : "text-blue-600"
          }`}
        >
          {transactionType}로 인한 변화
        </h2>
        <div className="space-y-2">
          {changes.averagePrice && (
            <p>
              평균가: ${changes.averagePrice.new.toFixed(2)}
              <span
                className={`ml-2 ${getChangeColor(
                  changes.averagePrice.change
                )}`}
              >
                ({changes.averagePrice.change > 0 ? "+" : ""}
                {changes.averagePrice.change.toFixed(2)})
              </span>
            </p>
          )}
          {changes.quantity && (
            <p>
              수량: {changes.quantity.new}개
              <span
                className={`ml-2 ${getChangeColor(changes.quantity.change)}`}
              >
                ({changes.quantity.change > 0 ? "+" : ""}
                {changes.quantity.change}개)
              </span>
            </p>
          )}
          {changes.tValue && (
            <p>
              T값: {changes.tValue.new.toFixed(1)}
              <span className={`ml-2 ${getChangeColor(changes.tValue.change)}`}>
                ({changes.tValue.change > 0 ? "+" : ""}
                {changes.tValue.change.toFixed(1)})
              </span>
            </p>
          )}
          {changes.cashBalance && (
            <p>
              예수금: $
              {(stock?.investment + changes.cashBalance.new).toFixed(2)}
              <span
                className={`ml-2 ${getChangeColor(changes.cashBalance.change)}`}
              >
                ({changes.cashBalance.change > 0 ? "+" : ""}
                {changes.cashBalance.change.toFixed(2)})
              </span>
            </p>
          )}
          {changes.profit && (
            <p>
              수익금: ${changes.profit.new.toFixed(2)}
              <span className={`ml-2 ${getChangeColor(changes.profit.change)}`}>
                ({changes.profit.change > 0 ? "+" : ""}
                {changes.profit.change.toFixed(2)})
              </span>
            </p>
          )}
        </div>
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionChangeModal;
