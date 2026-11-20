import { useState } from 'react';
import { Coffee } from 'lucide-react';

interface EditorialImageProps {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}

export function EditorialImage({ src, alt, className = '', eager = false }: EditorialImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#EEE8DE] text-[#76563E] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Coffee className="w-7 h-7 opacity-60 mb-2" strokeWidth={1.5} />
        <span className="font-serif text-sm text-[#302820]/80 max-w-[18ch]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
