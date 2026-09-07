import Product from "../models/Product.js";
import Review from "../models/Review.js";
import mongoose from "mongoose";

/**
 * Find or create product by handle. Reuses soft-hidden products so merchants
 * cannot wipe history by hiding and "re-adding" the same handle.
 */
const ensureProductForHandle = async (storeId, productHandle, productTitle) => {
  const handle = String(productHandle || '').trim();
  const title = String(productTitle || handle || 'Product').trim() || 'Product';
  if (!handle) {
    throw new Error('productHandle is required');
  }

  let product = await Product.findOne({ store: storeId, productHandle: handle }).setOptions({
    includeDeleted: true,
  });

  if (product) {
    if (!product.productTitle && title) {
      product.productTitle = title;
      await product.save();
    }
    return product;
  }

  try {
    product = await Product.create({
      store: storeId,
      productHandle: handle,
      productTitle: title,
    });
    return product;
  } catch (err) {
    // Race: unique index — re-fetch including hidden
    if (err?.code === 11000) {
      product = await Product.findOne({ store: storeId, productHandle: handle }).setOptions({
        includeDeleted: true,
      });
      if (product) return product;
    }
    throw err;
  }
};

const createReviewWithDiscovery = async (storeId, reviewData) => {
  try {
    const product = await ensureProductForHandle(
      storeId,
      reviewData.productHandle,
      reviewData.productTitle
    );

    const review = await Review.create({
      product: product._id,
      productTitle: reviewData.productTitle || product.productTitle,
      store: storeId,
      customerName: reviewData.customerName,
      customerEmail: reviewData.customerEmail,
      rating: reviewData.rating,
      comment: reviewData.comment,
      status: reviewData.status || 'approved',
      isVerifiedBuyer: Boolean(reviewData.isVerifiedBuyer),
      images: reviewData.images || [],
      isDeleted: Boolean(reviewData.isDeleted),
      deletedAt: reviewData.isDeleted ? new Date() : null,
      source: reviewData.source || 'native',
      externalId: reviewData.externalId || null,
      ...(reviewData.createdAt ? { createdAt: reviewData.createdAt } : {}),
    });
    return review;
  } catch (error) {
    console.error('Error in createReviewWithDiscovery', error);
    throw new Error('Failed to create review with discovery');
  }
};

const recalculateProductStats = async (productId) => {
  const pid =
    productId instanceof mongoose.Types.ObjectId
      ? productId
      : new mongoose.Types.ObjectId(String(productId));

  const stats = await Review.aggregate([
    {
      $match: {
        product: pid,
        status: 'approved',
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const finalStats =
    stats.length > 0
      ? {
          avgRating: Math.round(stats[0].avgRating * 10) / 10,
          totalReviews: stats[0].totalReviews,
        }
      : { avgRating: 0, totalReviews: 0 };

  await Product.findOneAndUpdate(
    { _id: productId },
    { stats: finalStats },
    { includeDeleted: true }
  );
};

export { createReviewWithDiscovery, recalculateProductStats, ensureProductForHandle };
