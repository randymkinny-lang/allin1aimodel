import React from 'react';

/**
 * The official gold "AI1AIM" infinity logo (uploaded brand asset).
 * Centralized here so the same image is used across the header, footer,
 * auth modal, and any other surface that needs the brand mark.
 */
export const BRAND_LOGO_URL =
  'https://d64gsuwffb70l.cloudfront.net/69e3fc416958e05d4f216fb0_1780369462937_b0834f8f.png';

interface BrandLogoProps {
  /** Pixel height of the logo. Width auto-scales to keep proportions. Default 36. */
  size?: number;
  /** Extra classes for the wrapping <img>. */
  className?: string;
  /** Kept for backwards-compatibility — ignored for the image logo. */
  withTile?: boolean;
  /** Kept for backwards-compatibility — ignored for the image logo. */
  tileRadius?: number;
  /** Accessible alt text. */
  title?: string;
}

/**
 * BrandLogo — renders the gold AI1AIM infinity logo as a proportional image.
 *
 * Use the `size` prop to set the rendered height in pixels; the width scales
 * automatically so the logo never stretches or distorts.
 */
const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 36,
  className = '',
  title = 'All in 1 AI Model',
}) => {
  return (
    <img
      src={BRAND_LOGO_URL}
      alt={title}
      style={{ height: size }}
      className={`w-auto object-contain ${className}`}
      draggable={false}
    />
  );
};

export default BrandLogo;
