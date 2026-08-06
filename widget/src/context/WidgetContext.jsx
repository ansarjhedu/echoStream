import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const WidgetContext = createContext();
export const useWidget = () => useContext(WidgetContext);

const PAGE_LIMIT = 10;

export const WidgetProvider = ({ apiKey, productHandle, productTitle, customerName, customerEmail, verificationHash, children }) => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, distribution: {} });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [widgetError, setWidgetError] = useState(null);
  const [storeType, setStoreType] = useState(null);
  const [activeReview, setActiveReview] = useState(null);

  const [config, setConfig] = useState({
    layout: 'glassmorphism',
    primaryColor: '#06b6d4',
    backgroundColor: '#0A0F1A',
    textColor: '#ffffff',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 15,
    fontWeight: 400,
    titleFontSize: 22,
    lineHeight: 1.5,
    carouselAutoplay: true,
    carouselIntervalMs: 3500,
    carouselShowArrows: true,
  });

  const isEcom = storeType === 'ecommerce';

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE || 'https://echo-stream-pi.vercel.app/api/public',
    headers: { 'x-api-key': apiKey }
  });

  const openReviewDetail = useCallback((review) => {
    if (review) setActiveReview(review);
  }, []);

  const closeReviewDetail = useCallback(() => {
    setActiveReview(null);
  }, []);

  const fetchReviews = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setWidgetError(null);

    try {
      const res = await api.get(`/products/${productHandle}/reviews`, {
        params: { page: pageNum, limit: PAGE_LIMIT },
      });

      const nextBatch = res.data.data || [];
      setReviews((prev) => (append ? [...prev, ...nextBatch] : nextBatch));
      setPage(pageNum);
      setHasMore(Boolean(res.data.pagination?.hasMore));

      if (res.data.stats) setStats(res.data.stats);
      if (res.data.storeType) setStoreType(res.data.storeType);
      if (res.data.widgetConfig) {
        setConfig((prev) => ({ ...prev, ...res.data.widgetConfig }));
      }
    } catch (error) {
      console.error('AXIOS ERROR:', error);
      const exactError = error.response?.data?.message || error.message || 'Unknown Error';
      setWidgetError(`Error: ${exactError}`);
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [apiKey, productHandle]);

  useEffect(() => {
    fetchReviews(1, false);
  }, [productHandle, apiKey]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    fetchReviews(page + 1, true);
  }, [hasMore, loadingMore, loading, page, fetchReviews]);

  const submitReview = async (formData) => {
    formData.append('productHandle', productHandle);
    formData.append('productTitle', productTitle);
    // Guest Presence forms already append name/email; commerce uses injected attrs.
    if (customerEmail && !formData.get('customerEmail')) {
      formData.append('customerEmail', customerEmail);
    }
    if (customerName && !formData.get('customerName')) {
      formData.append('customerName', customerName);
    }
    if (verificationHash) formData.append('verificationHash', verificationHash);

    try {
      await api.post('/reviews/add', formData);
      await fetchReviews(1, false);
      return true;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to submit review.');
    }
  };

  return (
    <WidgetContext.Provider value={{
      apiKey, productHandle, productTitle, customerName, customerEmail, verificationHash,
      reviews, stats, loading, isFormOpen, setIsFormOpen, submitReview, widgetError,
      config, storeType, isEcom,
      activeReview, openReviewDetail, closeReviewDetail,
      hasMore, loadingMore, loadMore,
    }}>
      {children}
    </WidgetContext.Provider>
  );
};
