import React, { useEffect } from "react";

const TransactionForm = ({
  transactionInput,
  setTransactionInput,
  handleTransactionSubmit,
  handleCancel,
  isBuying,
  isSelling,
  stock,
  priceData = [],
}) => {
  // onWheel 이벤트 핸들러로 스크롤을 방지하는 함수
  const preventScroll = (e) => e.target.blur();

  // 날짜에 따른 가격 찾기 함수
  const findPriceForDate = (selectedDate) => {
    if (!priceData || priceData.length === 0) return "";

    // priceData를 날짜 순으로 정렬
    const sortedData = [...priceData].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // 선택한 날짜 이전의 가장 가까운 날짜 찾기
    let closestPrice = "";
    for (let i = sortedData.length - 1; i >= 0; i--) {
      if (
        new Date(sortedData[i].date) <
        new Date(selectedDate)
      ) {
        closestPrice = sortedData[i].price;
        break;
      }
    }

    return closestPrice;
  };

  // 날짜 변경 시 체결가 기본값 설정
  useEffect(() => {
    if (transactionInput.date && !transactionInput.price) {
      const suggestedPrice = findPriceForDate(
        transactionInput.date
      );
      if (suggestedPrice) {
        setTransactionInput((prev) => ({
          ...prev,
          price: suggestedPrice,
        }));
      }
    }
  }, [transactionInput.date]); // eslint-disable-line react-hooks/exhaustive-deps

  // 체결가나 수량이 변경될 때 수수료 자동 계산
  useEffect(() => {
    if (
      stock?.feeRate !== undefined &&
      transactionInput.price &&
      transactionInput.quantity
    ) {
      const price = parseFloat(transactionInput.price) || 0;
      const quantity =
        parseFloat(transactionInput.quantity) || 0;
      const feeRate = stock.feeRate / 100; // 퍼센트를 소수로 변환
      const calculatedFee = (
        price *
        quantity *
        feeRate
      ).toFixed(2);

      // 수동으로 수수료를 변경하지 않았다면 자동 계산값으로 업데이트
      if (!transactionInput.manualFeeEdit) {
        setTransactionInput((prev) => ({
          ...prev,
          fee: calculatedFee,
        }));
      }
    }
  }, [
    transactionInput.price,
    transactionInput.quantity,
    stock?.feeRate,
    transactionInput.manualFeeEdit,
    setTransactionInput,
  ]);

  // 트랜잭션 제출 시 quarterCutMode 상태에 따라 MOC 메모 자동 추가
  const handleSubmit = () => {
    // 매도 & quarterCutMode 상태일 때 자동으로 MOC 메모 추가
    if (
      isSelling &&
      stock?.quarterCutMode &&
      !transactionInput.memo
    ) {
      const updatedInput = {
        ...transactionInput,
        memo: transactionInput.memo
          ? `${transactionInput.memo} MOC`
          : "MOC",
      };
      setTransactionInput(updatedInput);
      handleTransactionSubmit(
        isBuying ? "매수" : "매도",
        updatedInput
      );
    } else {
      handleTransactionSubmit(
        isBuying ? "매수" : "매도",
        transactionInput
      );
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-4">
        {isBuying ? "매수 입력" : "매도 입력"}
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block">날짜:</label>
          <input
            type="date"
            value={transactionInput.date}
            onChange={(e) => {
              const newDate = e.target.value;
              const suggestedPrice =
                findPriceForDate(newDate);
              setTransactionInput({
                ...transactionInput,
                date: newDate,
                price:
                  suggestedPrice || transactionInput.price,
                manualFeeEdit: false,
              });
            }}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block">
            체결가:
            {priceData &&
              priceData.length > 0 &&
              transactionInput.date && (
                <span className="text-sm text-gray-500 ml-2">
                  (참고가:{" "}
                  {findPriceForDate(
                    transactionInput.date
                  ) || "데이터 없음"}
                  )
                </span>
              )}
          </label>
          <input
            type="number"
            value={transactionInput.price}
            onChange={(e) =>
              setTransactionInput({
                ...transactionInput,
                price: e.target.value,
                manualFeeEdit: false,
              })
            }
            onWheel={preventScroll} // 마우스 휠 방지 추가
            className="w-full p-2 border rounded"
            placeholder={
              findPriceForDate(transactionInput.date)
                ? `참고: ${findPriceForDate(
                    transactionInput.date
                  )}`
                : "체결가 입력"
            }
          />
        </div>
        <div>
          <label className="block">수량:</label>
          <input
            type="number"
            inputMode="numeric"
            value={transactionInput.quantity}
            onChange={(e) =>
              setTransactionInput({
                ...transactionInput,
                quantity: e.target.value,
                manualFeeEdit: false,
              })
            }
            onWheel={preventScroll} // 마우스 휠 방지 추가
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block">
            수수료:
            {stock?.feeRate !== undefined && (
              <span className="text-sm text-gray-500 ml-2">
                (기본 {stock.feeRate}% 적용됨)
              </span>
            )}
          </label>
          <input
            type="number"
            value={transactionInput.fee}
            onChange={(e) =>
              setTransactionInput({
                ...transactionInput,
                fee: e.target.value,
                manualFeeEdit: true,
              })
            }
            onWheel={preventScroll} // 마우스 휠 방지 추가
            className="w-full p-2 border rounded"
            placeholder={
              stock?.feeRate ? `자동 계산됨` : "수수료 입력"
            }
          />
        </div>
        <div>
          <label className="block">메모:</label>
          <input
            type="text"
            value={transactionInput.memo || ""}
            onChange={(e) =>
              setTransactionInput({
                ...transactionInput,
                memo: e.target.value,
              })
            }
            className="w-full p-2 border rounded"
            placeholder={
              isSelling && stock?.quarterCutMode
                ? "MOC 매도 (자동 추가됩니다)"
                : ""
            }
          />
        </div>
        <div className="flex space-x-4">
          <button
            onClick={handleSubmit}
            className={`w-full text-white py-2 rounded ${
              isBuying ? "bg-red-500" : "bg-blue-500"
            }`}>
            {isBuying ? "매수 등록" : "매도 등록"}
          </button>
          <button
            onClick={handleCancel}
            className="w-full bg-gray-400 text-white py-2 rounded">
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionForm;
