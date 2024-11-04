import React from 'react';
import { FaTrash } from 'react-icons/fa'; // 휴지통 아이콘 불러오기
import { useNavigate } from 'react-router-dom'; // useNavigate 가져오기

const StockItem = ({ stock, onDelete }) => {
  const navigate = useNavigate(); // 페이지 이동을 위한 useNavigate

  // StockItem 클릭 시 세부 페이지로 이동
  const handleItemClick = () => {
    navigate(`/stock-detail/${stock.id}`); // stock.id를 기반으로 세부 페이지로 이동
  };

  // 삭제 버튼 클릭 시
  const handleDelete = (e) => {
    e.stopPropagation(); // 부모 요소의 클릭 이벤트 방지 (세부 페이지 이동 막기)
    if (window.confirm('이 종목을 삭제하시겠습니까?')) {
      onDelete(stock.id); // 삭제 핸들러 호출
    }
  };

  return (
    <div
      className="p-4 bg-gray-100 rounded-lg shadow-md flex justify-between items-center cursor-pointer hover:bg-gray-200"
      onClick={handleItemClick} // 클릭 시 세부 페이지로 이동
    >
      <div>
        <h2 className="text-xl font-semibold">{stock.name} (v{stock.version})</h2>
        <p>투자 금액: ${stock.investment}</p>
        <p>1회 매수금: ${stock.perTradeAmount.toFixed(2)}</p>
        <p className={stock.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
          투자 손익: ${stock.profit}
        </p>
      </div>

      {/* 휴지통 아이콘 */}
      <div 
        className="text-red-500 cursor-pointer flex justify-center items-center w-10 h-10 bg-red-100 rounded-full" 
        onClick={handleDelete} // 삭제 처리
      >
        <FaTrash className="text-2xl" />
      </div>
    </div>
  );
};

export default StockItem;