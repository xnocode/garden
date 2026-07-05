import React, { useEffect, useRef, useState } from 'react';

type AdBannerProps = {
  /** Optional ad slot ID; defaults to the primary slot. */
  slotId?: string;
};

type AdStatus = 'pending' | 'filled' | 'unfilled';

/**
 * Lazy‑loads a Google AdSense ad when it scrolls into view.
 * Hides itself completely when AdSense does not fill the slot,
 * preventing an empty white box from appearing on the page.
 */
export const AdBanner: React.FC<AdBannerProps> = ({ slotId = '5327787791' }) => {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      // @ts-ignore – push call defined by AdSense script.
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

  // Completely invisible until AdSense confirms the slot is filled.
  // height:0 + overflow:hidden hides the AdSense iframe during pending/unfilled
  // without removing it from the DOM (so AdSense can still measure width).
  const isFilled = adStatus === 'filled';

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: isFilled ? 'auto' : 0,
        overflow: 'hidden',
        minHeight: isFilled ? '120px' : undefined,
      }}
    >
      {isVisible && (
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block', textAlign: 'center', width: '100%' }}
          data-ad-client="ca-pub-5993975585691806"
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      )}
    </div>
  );
};
