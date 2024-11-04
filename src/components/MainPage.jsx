import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StockItem from './StockItem'; // StockItem 컴포넌트 불러오기
import AddStock from './AddStock'; // AddStock 컴포넌트 불러오기
import { getStocks, saveStock, deleteStock } from '../db'; // IndexedDB에서 데이터를 불러오는 함수와 삭제 함수

const MainPage = () => {
  const [stocks, setStocks] = useState([]); // 주식 데이터를 상태로 관리
  const [isAdding, setIsAdding] = useState(false); // 종목 추가 폼 표시 여부
  const navigate = useNavigate(); // useNavigate 훅으로 페이지 이동 관리

  // 컴포넌트가 처음 마운트될 때 DB에서 데이터 로드
  useEffect(() => {
    const loadStocks = async () => {
      try {
        const storedStocks = await getStocks(); // IndexedDB에서 주식 데이터 불러오기
        setStocks(storedStocks); // 불러온 데이터를 상태에 저장
      } catch (error) {
        console.error('Error loading stocks:', error);
      }
    };
    loadStocks(); // 데이터 로드 함수 실행
  }, []);

  // StockItem 클릭 시 세부 페이지로 이동
  const handleItemClick = (id) => {
    navigate(`/stock-detail/${id}`); // 특정 종목의 세부 페이지로 이동
  };

  // StockItem 삭제 처리
  const handleDeleteStock = async (id) => {
    try {
      await deleteStock(id); // IndexedDB에서 데이터 삭제
      setStocks(stocks.filter(stock => stock.id !== id)); // 상태에서 삭제된 항목 제거
    } catch (error) {
      console.error('Error deleting stock:', error); // 삭제 오류 처리
    }
  };

  // 새로운 종목 추가 처리
  const handleAddStock = async (newStock) => {
    try {
      await saveStock(newStock); // IndexedDB에 저장
      setStocks((prevStocks) => [...prevStocks, newStock]); // 상태에 추가
      setIsAdding(false); // 폼을 숨기기
    } catch (error) {
      console.error('Error saving stock:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-md">
      <h1 className="text-3xl font-bold mb-6 text-center">무한매수</h1>

      {/* 운용 종목 리스트 */}
      {stocks.length > 0 ? (
        <div className="space-y-4">
          {stocks.map(stock => (
            <StockItem
              key={stock.id}
              stock={stock}
              onItemClick={handleItemClick} // 클릭 시 세부 페이지 이동
              onDelete={handleDeleteStock}  // 삭제 처리
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500">운용 중인 종목이 없습니다.</p>
      )}

      {/* 종목 추가 버튼 */}
      <div className="text-center mt-6">
        {!isAdding ? (
          <button
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            onClick={() => setIsAdding(true)} // 폼 표시
          >
            종목 추가
          </button>
        ) : (
          <button
            className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
            onClick={() => setIsAdding(false)} // 폼 숨기기
          >
            취소
          </button>
        )}
      </div>

      {/* AddStock 폼 */}
      {isAdding && (
        <AddStock onAdd={handleAddStock} /> // AddStock 폼 렌더링, 데이터 추가 후 처리
      )}
    </div>
  );
};

export default MainPage;