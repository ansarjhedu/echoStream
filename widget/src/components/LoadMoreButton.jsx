import React from 'react';
import { useWidget } from '../context/WidgetContext';

export default function LoadMoreButton() {
  const { hasMore, loadMore, loadingMore } = useWidget();

  if (!hasMore) return null;

  return (
    <div className="text-center mt-6 pt-4 border-t" style={{ borderColor: 'var(--echo-border)' }}>
      <button
        type="button"
        onClick={loadMore}
        disabled={loadingMore}
        className="min-h-[44px] px-6 py-2.5 rounded-full font-bold text-sm border transition-opacity hover:opacity-80 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        style={{ borderColor: 'var(--echo-primary)', color: 'var(--echo-primary)' }}
      >
        {loadingMore && (
          <span
            className="w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--echo-border)', borderTopColor: 'var(--echo-primary)' }}
            aria-hidden="true"
          />
        )}
        {loadingMore ? 'Loading...' : 'Load More Reviews'}
      </button>
    </div>
  );
}