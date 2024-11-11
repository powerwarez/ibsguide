import React from 'react';

const DeleteModal = ({ transaction, onDeleteConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 w-80 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">거래 삭제 확인</h2>
        <p className="mb-2">정말로 이 거래를 삭제하시겠습니까?</p>
        <p className="text-sm text-gray-700">거래 유형: {transaction.type}</p>
        <p className="text-sm text-gray-700">날짜: {transaction.date}</p>
        <p className="text-sm text-gray-700">가격: ${transaction.price}</p>
        <p className="text-sm text-gray-700">수량: {Math.abs(transaction.quantity)}</p>
        <p className="text-sm text-gray-700">수수료: ${transaction.fee}</p>
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400"
          >
            취소
          </button>
          <button
            onClick={() => onDeleteConfirm(transaction.id)}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;