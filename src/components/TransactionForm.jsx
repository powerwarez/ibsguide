import React from 'react';

const TransactionForm = ({ transactionInput, setTransactionInput, handleTransactionSubmit, handleCancel, isBuying, isSelling, stock }) => {
  // onWheel 이벤트 핸들러로 스크롤을 방지하는 함수
  const preventScroll = (e) => e.target.blur();

  // 트랜잭션 제출 시 quarterCutMode 상태에 따라 MOC 메모 자동 추가
  const handleSubmit = () => {
    // 매도 & quarterCutMode 상태일 때 자동으로 MOC 메모 추가
    if (isSelling && stock?.quarterCutMode && !transactionInput.memo) {
      const updatedInput = { 
        ...transactionInput, 
        memo: transactionInput.memo ? `${transactionInput.memo} MOC` : "MOC"
      };
      setTransactionInput(updatedInput);
      handleTransactionSubmit(isBuying ? '매수' : '매도', updatedInput);
    } else {
      handleTransactionSubmit(isBuying ? '매수' : '매도', transactionInput);
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-4">{isBuying ? '매수 입력' : '매도 입력'}</h3>
      <div className="space-y-4">
        <div>
          <label className="block">날짜:</label>
          <input
            type="date"
            value={transactionInput.date}
            onChange={(e) => setTransactionInput({ ...transactionInput, date: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block">체결가:</label>
          <input
            type="number"
            value={transactionInput.price}
            onChange={(e) => setTransactionInput({ ...transactionInput, price: e.target.value })}
            onWheel={preventScroll} // 마우스 휠 방지 추가
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block">수량:</label>
          <input
            type="number"
            inputMode="numeric"
            value={transactionInput.quantity}
            onChange={(e) => setTransactionInput({ ...transactionInput, quantity: e.target.value })}
            onWheel={preventScroll} // 마우스 휠 방지 추가
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block">수수료:</label>
          <input
            type="number"
            value={transactionInput.fee}
            onChange={(e) => setTransactionInput({ ...transactionInput, fee: e.target.value })}
            onWheel={preventScroll} // 마우스 휠 방지 추가
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block">메모:</label>
          <input
            type="text"
            value={transactionInput.memo || ''}
            onChange={(e) => setTransactionInput({ ...transactionInput, memo: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder={isSelling && stock?.quarterCutMode ? "MOC 매도 (자동 추가됩니다)" : ""}
          />
        </div>
        <div className="flex space-x-4">
          <button
            onClick={handleSubmit}
            className={`w-full text-white py-2 rounded ${isBuying ? 'bg-red-500' : 'bg-blue-500'}`}
          >
            {isBuying ? '매수 등록' : '매도 등록'}
          </button>
          <button
            onClick={handleCancel}
            className="w-full bg-gray-400 text-white py-2 rounded"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionForm;
