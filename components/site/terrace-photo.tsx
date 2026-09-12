import type { Locale } from '@/config/i18n';

/** Licensed static photography. No video, frame sequence, or animation preload. */
export function TerracePhoto({ locale, solar = false, priority = false }: { locale: Locale; solar?: boolean; priority?: boolean }) {
  const english = locale === 'en';
  return <figure className={`terrace-photo ${solar ? 'terrace-photo-solar' : ''}`}>
    <picture>
      <img
        src={solar ? '/images/solar-home-real-1440.webp' : '/images/terrace-house-1920.jpg'}
        srcSet={solar ? '/images/solar-home-real-768.webp 768w, /images/solar-home-real-1440.webp 1440w' : '/images/terrace-house-768.jpg 768w, /images/terrace-house-1920.jpg 1920w'}
        sizes={priority ? '100vw' : '(max-width: 900px) 100vw, 45vw'}
        width={solar ? 1440 : 1920}
        height={solar ? 960 : 1080}
        alt={solar ? (english ? 'Solar panels on a tiled home roof beside palm trees' : 'แผงโซลาร์บนหลังคาบ้านกระเบื้องข้างต้นปาล์ม') : (english ? 'A tropical home framed by palms in warm evening light' : 'บ้านท่ามกลางต้นปาล์มในแสงอบอุ่นยามเย็น')}
        loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async"
      />
    </picture>
    <figcaption><a href={solar ? 'https://www.pexels.com/photo/solar-panel-on-roof-of-house-in-california-usa-9875438/' : 'https://www.pexels.com/photo/modern-tropical-house-with-palm-trees-at-sunset-34569495/'} target="_blank" rel="noopener noreferrer">
      {english ? 'Illustrative photograph' : 'ภาพประกอบ'} · {solar ? 'Kindel Media' : 'Alef Morais'} / Pexels
    </a></figcaption>
  </figure>;
}
