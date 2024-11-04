import React from 'react';
import StockItem from './StockItem';

const StockList = ({ stocks, onDelete }) => {
  return (
    <div className="bg-gray-100 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-center">운용 중인 종목</h2>
      <div className="space-y-4">
        {stocks.map(stock => (
          <StockItem key={stock.id} stock={stock} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
};

export default StockList;