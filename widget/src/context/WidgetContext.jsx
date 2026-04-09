import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const WidgetContext = createContext();

export const useWidget = () => useContext(WidgetContext);

export const WidgetProvider = ({ apiKey, productHandle, productTitle, customerName, customerEmail, children }) => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0 }); // <-- New state for DB stats
  const [loading, setLoading] = useState(true);
  const[isFormOpen, setIsFormOpen] = useState(false);

  // Change to your production URL later
  const API_BASE = 'https://echo-stream-pi.vercel.app/api/public';

  // Axios instance with default headers for cleaner API calls
  const api = axios.create({
    baseURL: API_BASE,
    headers: { 'x-api-key': apiKey }
  });

  useEffect(() => {
    fetchReviews();
  }, [productHandle]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/products/${productHandle}/reviews`);
      
      setReviews(res.data.data ||[]);
      
      // Use the stats calculated by MongoDB!
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (error) {
      console.error("Failed to load reviews", error);
    } finally {
      setLoading(false);
    }
  };

  
  const submitReview = async (formData) => {
    formData.append('productHandle', productHandle);
    formData.append('productTitle', productTitle);
    
    // Auto-attach the secure email if it exists
    if (customerEmail) {
     
      formData.append('customerEmail', customerEmail);
    }

    try {
      await api.post('/reviews/add', formData);
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to submit review.';
      throw new Error(errorMessage);
    }
  };

  return (
    <WidgetContext.Provider value={{
      apiKey, 
      productHandle,
      productTitle,
      customerName, 
      customerEmail, 
      reviews,
      stats, 
      loading, 
      isFormOpen, 
      setIsFormOpen, 
      submitReview
    }}>
      {children}
    </WidgetContext.Provider>
  );
};