import React from "react";

const TransactionTable = ({
  transactions,
  isSettled,
  onDeleteClick,
}) => {
  // localStorage에서 미국시간 설정 가져오기
  const [useUSTime, setUseUSTime] = React.useState(() => {
    const saved = localStorage.getItem("useUSTime");
    return saved === "true";
  });

  // localStorage 변경 감지
  React.useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("useUSTime");
      setUseUSTime(saved === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    // 같은 창에서의 변경 감지를 위한 커스텀 이벤트
    window.addEventListener(
      "useUSTimeChanged",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
      window.removeEventListener(
        "useUSTimeChanged",
        handleStorageChange
      );
    };
  }, []);

  // 한국시간을 미국시간으로 변환 (표시용)
  const toUSDateDisplay = (dateString) => {
    if (!dateString || !useUSTime) return dateString;
    const date = new Date(dateString);
    // 한국시간 기준 하루 전날로 표시 (미국 시장 기준)
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0];
  };

  return (
    <table className="w-full border-collapse mt-6">
      <thead>
        <tr className="bg-gray-200">
          <th className="p-2 border">
            날짜{" "}
            {useUSTime && (
              <span className="text-xs">(US)</span>
            )}
          </th>
          <th className="p-2 border">유형</th>
          <th className="p-2 border">체결가</th>
          <th className="p-2 border">수량</th>
          <th className="p-2 border">수수료</th>
          <th className="p-2 border">삭제</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((transaction, index) => {
          const displayDate = toUSDateDisplay(
            transaction.date
          );
          return (
            <tr
              key={transaction.id || index}
              className="text-center">
              <td className="p-2 border">
                {displayDate.replace(
                  /(\d{4})-(\d{2})-(\d{2})/,
                  (match, p1, p2, p3) => `${p2}.${p3}.`
                )}
              </td>
              <td
                className={`p-2 border ${
                  transaction.type === "매수"
                    ? "text-red-500"
                    : "text-blue-500"
                }`}>
                {transaction.type}
              </td>
              <td className="p-2 border">
                ${transaction.price}
              </td>
              <td className="p-2 border">
                {Math.abs(transaction.quantity)}
              </td>
              <td className="p-2 border">
                ${transaction.fee}
              </td>
              <td className="p-2 border text-center">
                {!isSettled && (
                  <div className="flex justify-center">
                    <button
                      onClick={() =>
                        onDeleteClick(transaction)
                      }
                      className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                      X
                    </button>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default TransactionTable;
