import React, { useState } from "react";

const StockSplitModal = ({
  isOpen,
  onClose,
  onConfirm,
  currentAveragePrice,
  currentQuantity,
}) => {
  const [splitRatio, setSplitRatio] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSplitRatioChange = (e) => {
    const value = e.target.value;
    setSplitRatio(value);
    setError("");
  };

  const handleConfirm = () => {
    const ratio = parseFloat(splitRatio);
    if (isNaN(ratio) || ratio <= 0) {
      setError("유효한 분할 비율을 입력해주세요.");
      return;
    }
    if (ratio === 1) {
      setError("1대1 분할은 의미가 없습니다.");
      return;
    }
    onConfirm(ratio);
    setSplitRatio("");
    setError("");
  };

  const handleCancel = () => {
    setSplitRatio("");
    setError("");
    onClose();
  };

  const ratio = parseFloat(splitRatio);
  const newAveragePrice =
    !isNaN(ratio) && ratio > 0
      ? currentAveragePrice / ratio
      : currentAveragePrice;
  const newQuantity =
    !isNaN(ratio) && ratio > 0
      ? currentQuantity * ratio
      : currentQuantity;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">주식 분할</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            1대 몇으로 분할하셨나요?
          </label>
          <input
            type="number"
            value={splitRatio}
            onChange={handleSplitRatioChange}
            placeholder="예: 2 (1대2 분할)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            step="0.1"
            min="0.1"
          />
          {error && (
            <p className="text-red-500 text-sm mt-1">{error}</p>
          )}
        </div>

        {splitRatio && !error && ratio > 0 && (
          <div className="mb-4 p-4 bg-gray-100 rounded-md">
            <h3 className="font-semibold mb-2">분할 후 변경 내역</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>현재 평균가:</span>
                <span>${currentAveragePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>분할 후 평균가:</span>
                <span className="font-bold text-blue-600">
                  ${newAveragePrice.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-gray-300 my-2"></div>
              <div className="flex justify-between">
                <span>현재 수량:</span>
                <span>{currentQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span>분할 후 수량:</span>
                <span className="font-bold text-blue-600">
                  {Math.floor(newQuantity)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors">
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!splitRatio || !!error}
            className={`flex-1 px-4 py-2 rounded-md transition-colors ${
              splitRatio && !error
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockSplitModal;

