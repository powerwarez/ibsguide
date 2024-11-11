import React from 'react';

const ConfirmSettlementModal = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 w-80 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">정산 확인</h2>
        <p>총 수량이 0이 되어 운용 종목이 정산됩니다. 계속하시겠습니까?</p>
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            계속
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSettlementModal;