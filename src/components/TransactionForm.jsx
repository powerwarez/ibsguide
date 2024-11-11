import React from 'react';

const TransactionForm = ({ transactionInput, setTransactionInput, handleTransactionSubmit, handleCancel, isBuying, isSelling }) => {
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
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block">수량:</label>
          <input
            type="number"
            value={transactionInput.quantity}
            onChange={(e) => setTransactionInput({ ...transactionInput, quantity: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block">수수료:</label>
          <input
            type="number"
            value={transactionInput.fee}
            onChange={(e) => setTransactionInput({ ...transactionInput, fee: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => handleTransactionSubmit(isBuying ? '매수' : '매도')}
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