import React from "react";

const TransactionTable = ({ transactions, isSettled, onDeleteClick }) => {
  return (
    <table className="w-full border-collapse mt-6">
      <thead>
        <tr className="bg-gray-200">
          <th className="p-2 border">날짜</th>
          <th className="p-2 border">유형</th>
          <th className="p-2 border">체결가</th>
          <th className="p-2 border">수량</th>
          <th className="p-2 border">수수료</th>
          <th className="p-2 border">삭제</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((transaction, index) => (
          <tr key={transaction.id || index} className="text-center">
            {/* <td className="p-2 border">{transaction.date.replace(/(\d{4})-(\d{2})-(\d{2})/, (match, p1, p2, p3) => `${p1.slice(2)}.${p2}.${p3}.`)}</td> */}
            <td className="p-2 border">
              {transaction.date.replace(
                /(\d{4})-(\d{2})-(\d{2})/,
                (match, p1, p2, p3) => `${p2}.${p3}.`
              )}
            </td>
            <td
              className={`p-2 border ${
                transaction.type === "매수" ? "text-red-500" : "text-blue-500"
              }`}
            >
              {transaction.type}
            </td>
            <td className="p-2 border">${transaction.price}</td>
            <td className="p-2 border">{Math.abs(transaction.quantity)}</td>
            <td className="p-2 border">${transaction.fee}</td>
            <td className="p-2 border text-center">
              {!isSettled && (
                <div className="flex justify-center">
                  <button
                    onClick={() => onDeleteClick(transaction)}
                    className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    X
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TransactionTable;
