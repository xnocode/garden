import React, { useEffect, useRef, useState } from 'react';

type AdBannerProps = {
  /** Optional ad slot ID; defaults to the primary slot. */
  slotId?: string;
};

/**
 * Lazy‑loads a Google AdSense ad when it scrolls into view.
 * A fixed min‑height placeholder prevents CLS (cumulative layout shift).
 */
export const AdBanner: React.FC<AdBannerProps> = ({ slotId = '5327787791' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

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

  // Once visible, request AdSense to render the ad.
  useEffect(() => {
    if (!isVisible) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      // @ts-ignore – push call defined by AdSense script.
      (window as any).adsbygoogle.push({});
    } catch (e) {
      console.error('AdSense init error', e);
    }
  }, [isVisible]);

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '120px',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      {isVisible && (
        <ins
          className="adsbygoogle"
          style={{ display: 'block', textAlign: 'center' }}
          data-ad-client="ca-pub-5993875585691806"
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      )}
    </div>
  );
};
