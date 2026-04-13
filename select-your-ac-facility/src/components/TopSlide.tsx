import { useState } from 'react';
import { ImageModal } from './ImageModal';

interface TopSlideProps {
  onInfo: () => void;
  onQuiz: () => void;
}

const acTypes = [
  { img: `${import.meta.env.BASE_URL}images/individual.webp`, name: '個別空調', catch: '各部屋に寒冷地用エアコンを配置。\n人気の「床下エアコン暖房」も採用可能です。', color: 'var(--color-accent-blue)' },
  { img: `${import.meta.env.BASE_URL}images/distributed.webp`, name: '分配空調', catch: 'エアコンの温風冷風を各部屋へ分配。\n温風は床下にも送られ、足下から暖かくくらせます。', color: 'var(--color-accent-orange)' },
  { img: `${import.meta.env.BASE_URL}images/whole-house.webp`, name: '全館空調', catch: 'エアコン１台で住まい全体を冷暖房。\n部屋ごとの室温もコントロールできます。', color: 'var(--color-accent-green)' },
];

export function TopSlide({ onInfo, onQuiz }: TopSlideProps) {
  const [modalImg, setModalImg] = useState<{ src: string; alt: string } | null>(null);

  return (
    <div className="h-full flex flex-col items-center justify-center gap-[2vh] px-[12vw] py-[12vh] relative">
      {/* Admin link */}
      <a
        href="#admin"
        className="absolute top-4 right-4 text-[13px] cursor-pointer px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
        style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-card-border)' }}
      >
        設定
      </a>

      {/* Hero - compact */}
      <div className="flex flex-col items-center text-center">
        <div
          className="text-[clamp(3rem,9vw,6rem)] tracking-[-0.03em] leading-[1]"
          style={{ color: 'var(--color-accent-orange)', fontFamily: "'DM Sans', sans-serif", fontWeight: 900 }}
        >
          SELECT YOUR A/C?
        </div>
        <h1 className="text-[clamp(0.9rem,2.5vw,1.3rem)] font-bold leading-[1.3] tracking-tight mt-2">
          あなたのくらしに合う
          <span style={{ color: 'var(--color-accent-orange)' }}>空調</span>は？
        </h1>
      </div>

      {/* Cards - larger */}
      <div className="flex gap-3 md:gap-5 w-full flex-1 items-center min-h-0">
        {acTypes.map((item) => (
          <div
            key={item.name}
            className="flex-1 rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'rgba(255,255,255,0.6)', border: `1.5px solid ${String(item.color).replace('var(--color-accent-', '').replace(')', '')}25` }}
          >
            {/* Image - fixed height area */}
            <div
              className="px-3 pt-3 md:px-4 md:pt-4 cursor-pointer relative group"
              onClick={() => setModalImg({ src: item.img, alt: item.name })}
            >
              <img src={item.img} alt={item.name} className="w-full rounded-xl object-contain" style={{ maxHeight: '45vh' }} />
              <div
                className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(42, 33, 24, 0.6)', color: 'white' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
            </div>

            {/* Label area - structured rows */}
            <div className="px-3 py-2.5 md:px-4 md:py-3 text-center flex flex-col">
              {/* Row 1: 方式名 */}
              <div className="text-base md:text-lg font-black" style={{ color: item.color }}>{item.name}</div>

              {/* Row 2: ロゴ (fixed height to align across cards) */}
              <div className="h-[clamp(32px,4vw,44px)] flex flex-col items-center justify-center">
                {item.name === '分配空調' && (
                  <>
                    <span style={{ fontFamily: "'Chillax', sans-serif", fontWeight: 600, fontSize: 'clamp(11px, 1.4vw, 15px)', color: item.color }}>
                      AirFlowBeyond
                    </span>
                    <span className="text-[13px] md:text-[11px] leading-none mt-0.5" style={{ color: 'var(--color-text-sub)' }}>
                      エアフロー・ビヨンド
                    </span>
                  </>
                )}
                {item.name === '全館空調' && (
                  <>
                    <img src={`${import.meta.env.BASE_URL}images/withair-logo.png`} alt="withair" className="h-[clamp(10px,1.3vw,14px)]" style={{ filter: 'brightness(0) saturate(100%) invert(56%) sepia(52%) saturate(522%) hue-rotate(101deg) brightness(97%) contrast(92%)' }} />
                    <span className="text-[13px] md:text-[11px] leading-none mt-1" style={{ color: 'var(--color-text-sub)' }}>
                      ウィズエアー
                    </span>
                  </>
                )}
              </div>

              {/* Row 3: 説明テキスト */}
              <div className="text-[13px] md:text-sm mt-1 whitespace-pre-line flex-1" style={{ color: 'var(--color-text-sub)' }}>{item.catch}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA - compact */}
      <div className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto w-full">
        <button
          onClick={onInfo}
          className="flex-1 py-3 rounded-full cursor-pointer inline-flex items-center justify-center gap-2 transition-all hover:scale-[1.03]"
          style={{ background: 'var(--color-accent-orange)', color: 'white', fontSize: 'clamp(12px, 1.6vw, 16px)', fontWeight: 700, fontFamily: "'Noto Sans JP', sans-serif", boxShadow: '0 4px 16px rgba(232, 115, 74, 0.3)' }}
        >
          それぞれの特徴を知る
          <span className="w-5 h-5 rounded-full border-[1.5px] border-white/60 inline-flex items-center justify-center text-[13px]">→</span>
        </button>
        <button
          onClick={onQuiz}
          className="flex-1 py-3 rounded-full cursor-pointer inline-flex items-center justify-center gap-2 transition-all hover:scale-[1.03]"
          style={{ background: 'var(--color-text)', color: 'var(--color-bg)', fontSize: 'clamp(12px, 1.6vw, 16px)', fontWeight: 700, fontFamily: "'Noto Sans JP', sans-serif", boxShadow: '0 4px 16px rgba(42, 33, 24, 0.2)' }}
        >
          自分に合う空調を診断
          <span className="w-5 h-5 rounded-full border-[1.5px] inline-flex items-center justify-center text-[13px]" style={{ borderColor: 'rgba(240,232,218,0.6)' }}>→</span>
        </button>
      </div>

      {/* Image modal */}
      {modalImg && (
        <ImageModal src={modalImg.src} alt={modalImg.alt} onClose={() => setModalImg(null)} />
      )}
    </div>
  );
}
