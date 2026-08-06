import GlassmorphismMockup from '../components/widget-mockups/GlassmorphismMockup';
import ClassicMockup from '../components/widget-mockups/ClassicMockup';
import MinimalMockup from '../components/widget-mockups/MinimalMockup';
import GridMockup from '../components/widget-mockups/GridMockup';
import CarouselMockup from '../components/widget-mockups/CarouselMockup';
import BrutalismMockup from '../components/widget-mockups/BrutalismMockup';

export const WIDGET_CATALOG = [
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Frosted panels and soft glow — premium on dark host pages.',
    bestFor: 'Brand sites & portfolios',
  },
  {
    id: 'classic',
    name: 'Classic Store',
    description: 'Familiar star-distribution chrome shoppers already trust.',
    bestFor: 'eCommerce PDPs',
  },
  {
    id: 'minimal',
    name: 'Minimalist',
    description: 'Quiet type and whitespace for editorial and blog layouts.',
    bestFor: 'Blogs & portfolios',
  },
  {
    id: 'grid',
    name: 'Masonry Grid',
    description: 'Dense multi-column voices for high review volume.',
    bestFor: 'Catalogs & marketplaces',
  },
  {
    id: 'carousel',
    name: 'Swipe Carousel',
    description: 'Auto-play social proof with snap scrolling and arrows.',
    bestFor: 'Homepages & landing heroes',
    livePreview: true,
  },
  {
    id: 'brutalism',
    name: 'Neo-Brutalism',
    description: 'Hard borders and offset shadows that refuse to blend in.',
    bestFor: 'Bold brand moments',
  },
];

export const CATALOG_MOCK_REVIEWS = [
  {
    id: 1,
    name: 'Sarah Jenkins',
    rating: 5,
    date: '2 days ago',
    comment: 'Absolutely love the quality. It exceeded my expectations completely!',
  },
  {
    id: 2,
    name: 'Marcus Doe',
    rating: 4,
    date: '1 week ago',
    comment: 'Great product, but shipping took a little longer than expected.',
  },
];

/** Preview styles shared by Catalog + Design Lab so tokens match the live widget. */
export function previewThemeStyle(config = {}) {
  const primary = config.primaryColor || '#06b6d4';
  const bg = config.backgroundColor || '#0A0F1A';
  const text = config.textColor || '#ffffff';
  return {
    '--p-color': primary,
    '--bg-color': bg,
    '--t-color': text,
    '--echo-primary': primary,
    '--echo-bg': bg,
    '--echo-text': text,
    '--echo-title-size': `${config.titleFontSize || 22}px`,
    '--echo-border': `color-mix(in srgb, ${text} 15%, transparent)`,
    '--echo-input': `color-mix(in srgb, ${text} 5%, transparent)`,
    fontFamily: config.fontFamily || 'system-ui, sans-serif',
    fontSize: `${config.fontSize || 15}px`,
    fontWeight: config.fontWeight || 400,
    lineHeight: config.lineHeight || 1.5,
    backgroundColor: bg,
    color: text,
  };
}

export function CatalogLayoutPreview({ layoutId, carouselConfig }) {
  const reviews = CATALOG_MOCK_REVIEWS;
  switch (layoutId) {
    case 'classic':
      return <ClassicMockup reviews={reviews} />;
    case 'minimal':
      return <MinimalMockup reviews={reviews} />;
    case 'grid':
      return <GridMockup reviews={reviews} />;
    case 'carousel':
      return (
        <CarouselMockup
          reviews={reviews}
          carouselAutoplay={carouselConfig?.carouselAutoplay !== false}
          carouselIntervalMs={carouselConfig?.carouselIntervalMs || 3500}
          carouselShowArrows={carouselConfig?.carouselShowArrows !== false}
        />
      );
    case 'brutalism':
      return <BrutalismMockup reviews={reviews} />;
    case 'glassmorphism':
    default:
      return <GlassmorphismMockup reviews={reviews} />;
  }
}
