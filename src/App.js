import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainPage from './components/MainPage';
import AddStock from './components/AddStock';
import StockDetail from './components/StockDetail';
import { getStocks, saveStock } from './db';

const App = () => {
  const [stocks, setStocks] = useState([]);

  useEffect(() => {
    const loadStocks = async () => {
      const storedStocks = await getStocks();
      setStocks(storedStocks);
    };
    loadStocks();
  }, []);

  const handleAddStock = async (newStock) => {
    await saveStock(newStock);
    setStocks((prevStocks) => [...prevStocks, newStock]);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={<MainPage stocks={stocks} setStocks={setStocks} />}
      />
      <Route
        path="/add-stock"
        element={<AddStock onAdd={handleAddStock} />}
      />
      <Route
        path="/stock-detail/:id"
        element={<StockDetail stocks={stocks} />}
      />
    </Routes>
  );
};

export default App;