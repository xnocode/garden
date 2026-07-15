import React, { useEffect, useRef, useState } from 'react';

type AdFormat = 'auto' | 'in-article' | 'in-feed' | 'display';

type AdBannerProps = {
  /** The AdSense ad slot ID (from your AdSense dashboard). */
  slotId: string;
  /**
   * Ad format:
   *  - "auto"       — responsive display ad (default)
   *  - "in-article" — fluid in-article ad (sits inside article content)
   *  - "in-feed"    — in-feed / native ad
   *  - "display"    — fixed display ad
   */
  format?: AdFormat;
};

type AdStatus = 'pending' | 'filled' | 'unfilled';

const CLIENT_ID = 'ca-pub-5993975585691806';

/**
 * Universal Google AdSense ad unit.
 * - Lazy-loads when it scrolls into view (saves bandwidth + improves LCP).
 * - Hides itself completely when AdSense does not fill the slot,
 *   so no empty white box ever appears on the page.
 * - Supports all AdSense formats: auto, in-article, in-feed, display.
 */
export const AdBanner: React.FC<AdBannerProps> = ({
  slotId,
  format = 'auto',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const insRef = useRef<HTMLInsElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [adStatus, setAdStatus] = useState<AdStatus>('pending');

  // Observe when the placeholder enters the viewport.
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Once visible, push to AdSense and watch fill status via MutationObserver.
  useEffect(() => {
    if (!isVisible || !insRef.current) return;

    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (e) {
      console.error('AdSense init error', e);
    }

    // AdSense sets data-ad-status="filled" or "unfilled" on the <ins> element.
    const mo = new MutationObserver(() => {
      const status = insRef.current?.getAttribute('data-ad-status');
      if (status === 'filled') setAdStatus('filled');
      else if (status === 'unfilled') setAdStatus('unfilled');
    });
    mo.observe(insRef.current, { attributes: true, attributeFilter: ['data-ad-status'] });
    return () => mo.disconnect();
  }, [isVisible]);

  const isFilled = adStatus === 'filled';

  // Build <ins> props based on format
  const insProps: React.HTMLAttributes<HTMLElement> & Record<string, string | undefined> = {
    className: 'adsbygoogle',
    style: { display: 'block', textAlign: 'center', width: '100%' } as React.CSSProperties,
    'data-ad-client': CLIENT_ID,
    'data-ad-slot': slotId,
  };

  if (format === 'in-article') {
    insProps['data-ad-layout'] = 'in-article';
    insProps['data-ad-format'] = 'fluid';
  } else if (format === 'in-feed') {
    insProps['data-ad-layout'] = 'in-feed';
    insProps['data-ad-format'] = 'fluid';
  } else if (format === 'display') {
    insProps['data-ad-format'] = 'display';
    insProps['data-full-width-responsive'] = 'true';
  } else {
    // auto — let Google pick the best format
    insProps['data-ad-format'] = 'auto';
    insProps['data-full-width-responsive'] = 'true';
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: isFilled ? 'auto' : 0,
        overflow: 'hidden',
        minHeight: isFilled ? '100px' : undefined,
      }}
    >
      {isVisible && (
        <ins ref={insRef} {...(insProps as any)} />
      )}
    </div>
  );
};
