import type { Question } from '../data/questions';
import { ProgressBar } from './ProgressBar';

interface QuestionSlideProps {
  question: Question;
  selectedIndex: number | null;
  onSelect: (choiceIndex: number) => void;
  onNext: () => void;
  onBack: () => void;
  onTop: () => void;
  isFirst: boolean;
  progressCurrent: number;
  progressTotal: number;
}

export function QuestionSlide({
  question, selectedIndex, onSelect, onNext, onBack, onTop, isFirst, progressCurrent, progressTotal,
}: QuestionSlideProps) {
  return (
    <div className="h-full flex flex-col px-[12vw] py-[12vh]">
      {/* Content - centered */}
      <div className="flex-1 flex flex-col justify-center w-full max-w-xl mx-auto min-h-0">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-lg font-black" style={{ color: 'var(--color-accent-orange)' }}>
            {String(question.id).padStart(2, '0')}
          </span>
          <span className="stamp" style={{ background: 'rgba(42, 33, 24, 0.08)', color: 'var(--color-text-sub)' }}>
            Q{question.id}
          </span>
        </div>

        <h2 className="text-[clamp(1.1rem,2.5vw,1.5rem)] font-black mb-1 leading-snug">
          {question.title}
        </h2>
        <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-sub)' }}>
          {question.subtitle}
        </p>

        <div className="flex flex-col gap-2">
          {question.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`choice-btn text-left px-5 py-3.5 ${selectedIndex === i ? 'choice-btn-selected' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-black shrink-0 mt-0.5"
                  style={{
                    background: selectedIndex === i ? 'var(--color-accent-orange)' : 'rgba(42, 33, 24, 0.1)',
                    color: selectedIndex === i ? 'white' : 'var(--color-text-sub)',
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <div>
                  <div className="font-bold text-[clamp(12px,1.5vw,14px)] leading-snug">{choice.label}</div>
                  <div className="text-[clamp(10px,1.2vw,12px)] mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>
                    {choice.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Buttons - bottom */}
      <div className="flex justify-between items-center w-full max-w-xl mx-auto pt-4">
        {isFirst ? (
          <button onClick={onTop} className="nav-btn-outline px-6 py-3 text-sm">← トップへ</button>
        ) : (
          <button onClick={onBack} className="nav-btn-outline px-6 py-3 text-sm">← 戻る</button>
        )}
        <ProgressBar current={progressCurrent} total={progressTotal} />
        <button
          onClick={onNext}
          disabled={selectedIndex === null}
          className={`nav-btn px-8 py-3 text-sm ${selectedIndex === null ? 'opacity-30 pointer-events-none' : ''}`}
        >
          次へ →
        </button>
      </div>
    </div>
  );
}
