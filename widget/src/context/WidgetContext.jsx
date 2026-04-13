import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const WidgetContext = createContext();
export const useWidget = () => useContext(WidgetContext);

export const WidgetProvider = ({ apiKey, productHandle, productTitle, customerName, customerEmail, children }) => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, distribution: {} }); 
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [widgetError, setWidgetError] = useState(null);

  // 🎨 NEW: Default Design Configuration
  const[config, setConfig] = useState({
    layout: ' ',
    primaryColor: ' ',
    backgroundColor: ' ',
    textColor: ' ',
    fontFamily: ' '
  });

  const API_BASE = 'https://echo-stream-pi.vercel.app/api/public'; // Change to your live URL when deploying
  const api = axios.create({
    baseURL: API_BASE,
    headers: { 'x-api-key': apiKey }
  });

  useEffect(() => {
    fetchReviews();
  }, [productHandle, apiKey]);

  const fetchReviews = async () => {
    setLoading(true);
    setWidgetError(null);
    try {
      const res = await api.get(`/products/${productHandle}/reviews`);
      console.log(res)
      setReviews(res.data.data ||[]);
      if (res.data.stats) setStats(res.data.stats);
      
      // 🎨 Apply the Merchant's saved design settings!
      if (res.data.widgetConfig) {
        setConfig({
          // ...config, // Keep defaults just in case
          ...res.data.widgetConfig 
        });
      }
    } catch (error) {
      // THIS WILL PRINT THE EXACT ERROR ON THE SCREEN!
      console.error("AXIOS ERROR:", error);
      const exactError = error.response?.data?.message || error.message || "Unknown Error";
      setWidgetError(`Error: ${exactError}`);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (formData) => {
    formData.append('productHandle', productHandle);
    formData.append('productTitle', productTitle);
    if (customerEmail) formData.append('customerEmail', customerEmail);
    if (customerName) formData.append('customerName', customerName);
    
    try {
      await api.post('/reviews/add', formData);
      return true;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to submit review.');
    }
  };

  return (
    <WidgetContext.Provider value={{
      apiKey, productHandle, productTitle, customerName, customerEmail,
      reviews, stats, loading, isFormOpen, setIsFormOpen, submitReview, widgetError,
      config // <--- Expose the config to the UI
    }}>
      {children}
    </WidgetContext.Provider>
  );
};