import { systems, type SystemId } from '../data/systems';

interface ComparisonSlideProps {
  onQuiz: () => void;
  onBack: () => void;
}

const order: SystemId[] = ['myroom', 'smart', 'zenkan'];

export function ComparisonSlide({ onQuiz, onBack }: ComparisonSlideProps) {
  return (
    <div className="h-full flex flex-col px-[12vw] py-[12vh]">
      {/* Content - centered */}
      <div className="flex-1 flex flex-col justify-center w-full max-w-3xl mx-auto min-h-0 overflow-y-auto">
        <div className="text-center mb-3">
          <h2 className="text-[clamp(1.1rem,2.5vw,1.5rem)] font-black mb-1">3つの空調方式を比較</h2>
          <p className="text-[13px]" style={{ color: 'var(--color-text-sub)' }}>最適解はあなたの暮らし方で決まります</p>
        </div>

        <div className="grid grid-cols-3 gap-1.5 md:gap-2.5 mb-3">
          {order.map(id => {
            const s = systems[id];
            return (
              <div key={id} className="card p-2.5 md:p-3 text-center" style={{ borderColor: s.color + '30' }}>
                <h3 className="text-[13px] md:text-sm font-black mb-0.5" style={{ color: s.color }}>{s.name}</h3>
                <div className="text-[13px] font-bold px-2 py-0.5 rounded-full mb-2 inline-block" style={{ background: s.color + '12', color: s.color }}>
                  {s.price}
                </div>
                <div className="text-left mb-1.5">
                  <div className="text-[13px] font-black mb-0.5" style={{ color: 'var(--color-accent-green)' }}>輝くとき</div>
                  <p className="text-[13px] leading-snug" style={{ color: 'var(--color-text-sub)' }}>{s.bestFor}</p>
                </div>
                <div className="text-left">
                  <div className="text-[13px] font-black mb-0.5" style={{ color: '#c45040' }}>代償</div>
                  <p className="text-[13px] leading-snug" style={{ color: 'var(--color-text-sub)' }}>{s.worstFor}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card p-3 mb-3">
          <h4 className="text-[13px] font-black mb-2 text-center" style={{ color: 'var(--color-text-sub)' }}>生涯コスト（LCC）の違い</h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            {order.map(id => {
              const s = systems[id];
              return (
                <div key={id}>
                  <div className="text-[13px] font-black" style={{ color: s.color }}>{s.name}</div>
                  <div className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-sub)' }}>{s.lcc}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center">
          <p className="text-[13px] font-bold mb-2" style={{ color: 'var(--color-text-sub)' }}>
            あなたのライフスタイルに合う方式を、5つの質問で診断できます
          </p>
          <button onClick={onQuiz} className="cta-btn px-10 py-3 text-sm">
            自分に合う空調を診断する →
          </button>
        </div>
      </div>

      {/* Buttons - bottom */}
      <div className="flex justify-between items-center w-full max-w-3xl mx-auto pt-4">
        <button onClick={onBack} className="nav-btn-outline px-5 py-2.5 text-sm">← 戻る</button>
        <button onClick={onQuiz} className="nav-btn px-8 py-2.5 text-sm">次へ →</button>
      </div>
    </div>
  );
}
