import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StockItem from "./StockItem";
import AddStock from "./AddStock";
import { getStocks, saveStock, deleteStock } from "../db";

const MainPage = () => {
  const [stocks, setStocks] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTab, setSelectedTab] = useState("운용중");
  const navigate = useNavigate();

  useEffect(() => {
    const loadStocks = async () => {
      try {
        const storedStocks = await getStocks();
        setStocks(storedStocks);
      } catch (error) {
        console.error("Error loading stocks:", error);
      }
    };
    loadStocks();
  }, []);

  const handleItemClick = (id) => {
    navigate(`/stock-detail/${id}`);
  };

  const handleDeleteStock = async (id) => {
    try {
      await deleteStock(id);
      setStocks(stocks.filter((stock) => stock.id !== id));
    } catch (error) {
      console.error("Error deleting stock:", error);
    }
  };

  const handleAddStock = async (newStock) => {
    try {
      await saveStock(newStock);
      setStocks((prevStocks) => [...prevStocks, newStock]);
      setIsAdding(false);
    } catch (error) {
      console.error("Error saving stock:", error);
    }
  };

  // 정산된 탭의 전체 수익금 계산
  const totalProfit = stocks
    .filter((stock) => stock.isSettled)
    .reduce((sum, stock) => sum + (stock.profit || 0), 0);

  // 수익금에 따른 색상 클래스
  const profitColorClass =
    totalProfit > 0
      ? "text-red-600"
      : totalProfit < 0
      ? "text-blue-600"
      : "text-gray-600";

  // 정산된 종목 날짜 기준 내림차순 정렬
  const filteredStocks =
    selectedTab === "운용중"
      ? stocks.filter((stock) => !stock.isSettled)
      : stocks
          .filter((stock) => stock.isSettled)
          .sort((a, b) => {
            const dateA = a.name.match(
              /\((\d{4})년 (\d{2})월 (\d{2})일 정산\)/
            );
            const dateB = b.name.match(
              /\((\d{4})년 (\d{2})월 (\d{2})일 정산\)/
            );
            if (dateA && dateB) {
              const parsedDateA = new Date(
                `${dateA[1]}/${dateA[2]}/${dateA[3]}`
              );
              const parsedDateB = new Date(
                `${dateB[1]}/${dateB[2]}/${dateB[3]}`
              );
              return parsedDateB - parsedDateA;
            }
            return 0;
          });

  return (
    <div className="max-w-4xl mx-auto p-6 mb-12 bg-white shadow-md rounded-md">
      <h1 className="text-3xl font-bold mb-6 text-center">
        무한매수 도우미{" "}
        <span className="text-gray-500 text-sm ml-2">
          updated 25.09.11.
        </span>
      </h1>
      <div className="p-4 mb-6 bg-gray-100 rounded-lg shadow-md text-center">
        <h2 className="text-xl font-semibold">주의사항</h2>
        <p className="mt-2 text-sm text-gray-500">
          <span className="font-bold text-red-500">
            본 사이트는 무한 매수를 진행하는 분들의 개인적인
            기록이나 계산을 도와주는 사이트입니다.
            <br />
            해당 방법을 추천하거나, 특정종목을 추천하지
            않습니다.
            <br />
            매수매도를 추천하지 않으며, 수익을 보장하지
            않습니다.
            <br />
            투자여부에 대한 모든 판단 및 결정은 투자자
            스스로 하시기 바랍니다.
            <br />본 사이트는 투자자의 투자 결과에 대한
            책임을 지지 않습니다.
          </span>
        </p>
      </div>
      {/* 정산됨 탭의 전체 수익금 카드 */}
      {selectedTab === "정산됨" && (
        <div className="p-4 mb-6 bg-gray-100 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold">
            전체 수익금
          </h2>
          <p
            className={`text-2xl font-bold mt-2 ${profitColorClass}`}>
            ${totalProfit.toFixed(2)}
          </p>
        </div>
      )}

      {filteredStocks.length > 0 ? (
        <div className="space-y-4">
          {filteredStocks.map((stock) => (
            <StockItem
              key={stock.id}
              stock={stock}
              onItemClick={handleItemClick}
              onDelete={handleDeleteStock}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500">
          {selectedTab === "운용중"
            ? "운용 중인 종목이 없습니다."
            : "정산된 종목이 없습니다."}
        </p>
      )}

      {/* 운용중 탭에서만 종목 추가 버튼 표시 */}
      {selectedTab === "운용중" && (
        <div className="text-center mt-6">
          {!isAdding ? (
            <button
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              onClick={() => setIsAdding(true)}>
              종목 추가
            </button>
          ) : (
            <button
              className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
              onClick={() => setIsAdding(false)}>
              취소
            </button>
          )}
        </div>
      )}

      {isAdding && selectedTab === "운용중" && (
        <AddStock onAdd={handleAddStock} />
      )}

      {/* 하단 탭 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-300 flex justify-around">
        <button
          className={`py-4 flex-1 ${
            selectedTab === "운용중"
              ? "text-blue-600 font-semibold"
              : "text-gray-600"
          }`}
          onClick={() => setSelectedTab("운용중")}>
          운용중
        </button>
        <button
          className={`py-4 flex-1 ${
            selectedTab === "정산됨"
              ? "text-blue-600 font-semibold"
              : "text-gray-600"
          }`}
          onClick={() => setSelectedTab("정산됨")}>
          정산됨
        </button>
      </div>
    </div>
  );
};

export default MainPage;
