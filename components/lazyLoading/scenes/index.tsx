// components/LazyImage.tsx
import {useEffect, useState} from 'react';
import Image from 'next/image';

import {cn} from '@/lib/utils';
import type {LazyImageProps} from '../models';

export const LazyImage = ({src, alt, placeholder}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder || src);

  useEffect(() => {
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
    };
  }, [src]);

  return (
    <Image
      src={currentSrc}
      alt={alt}
      className={cn(
        'rounded-2xl border border-border/40 bg-card/60 object-cover shadow-sm shadow-primary/10 backdrop-blur-sm transition-all duration-500',
        isLoaded ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-0',
      )}
      onLoad={() => setIsLoaded(true)}
    />
  );
};
