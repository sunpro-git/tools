import { systems, type SystemId } from '../data/systems';
import { questions } from '../data/questions';

interface ResultSlideProps {
  answers: number[];
  onRestart: () => void;
}

function calculateResult(answers: number[]) {
  const scores: Record<SystemId, number> = { myroom: 0, smart: 0, zenkan: 0 };
  answers.forEach((ci, qi) => {
    const choice = questions[qi].choices[ci];
    for (const [id, s] of Object.entries(choice.scores)) scores[id as SystemId] += s;
  });
  const maxScore = Math.max(...Object.values(scores));
  const winners = (Object.keys(scores) as SystemId[]).filter(id => scores[id] === maxScore);
  const winner = (['smart', 'myroom', 'zenkan'] as SystemId[]).find(id => winners.includes(id))!;
  const reasons: string[] = [];
  answers.forEach((ci, qi) => {
    const q = questions[qi], c = q.choices[ci];
    if (c.scores[winner]) reasons.push(`${q.title} → 「${c.label}」`);
  });
  return { winner, scores, reasons };
}

export function ResultSlide({ answers, onRestart }: ResultSlideProps) {
  const { winner, scores, reasons } = calculateResult(answers);
  const system = systems[winner];
  const maxScore = Math.max(...Object.values(scores));

  return (
    <div className="h-full flex flex-col px-[12vw] py-[12vh]">
      {/* Content - centered, scrollable */}
      <div className="flex-1 flex flex-col justify-center w-full max-w-xl mx-auto min-h-0 overflow-y-auto">
        <div className="stamp mb-3" style={{ background: 'rgba(74, 184, 122, 0.12)', color: 'var(--color-accent-green)' }}>
          診断結果
        </div>
        <h2 className="text-[clamp(1.1rem,2.5vw,1.5rem)] font-black mb-1">あなたのライフスタイルに合う空調</h2>
        <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-sub)' }}>あなたの回答から見えた価値観をもとに選びました</p>

        <div className="card p-5 mb-3 text-center" style={{ borderColor: system.color, borderWidth: '2px' }}>
          <h3 className="text-xl font-black mb-0.5" style={{ color: system.color }}>{system.name}</h3>
          <p className="text-[13px] font-bold mb-2" style={{ color: 'var(--color-text-sub)' }}>{system.catch}</p>
          <p className="text-[13px] leading-relaxed mb-3">{system.description}</p>
          <div className="flex justify-center gap-2">
            <span className="text-[13px] font-bold px-3 py-1 rounded-full" style={{ background: system.color + '15', color: system.color }}>初期: {system.price}</span>
            <span className="text-[13px] font-bold px-3 py-1 rounded-full" style={{ background: '#2a211808', color: 'var(--color-text-sub)' }}>LCC: {system.lcc}</span>
          </div>
        </div>

        <div className="card p-3 mb-2">
          <h4 className="text-[13px] font-black mb-2" style={{ color: 'var(--color-text-sub)' }}>あなたの回答から見えた価値観</h4>
          <ul className="space-y-1.5">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] leading-snug">
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[13px] font-black shrink-0 mt-0.5"
                  style={{ background: system.color + '15', color: system.color }}>{i + 1}</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-3 mb-2" style={{ background: '#c4504008', borderColor: '#c4504020' }}>
          <h4 className="text-[13px] font-black mb-1" style={{ color: '#c45040' }}>この方式を選ぶなら知っておくべきこと</h4>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>{system.worstFor.join('、')}</p>
        </div>

        <div className="card p-3">
          <h4 className="text-[13px] font-black mb-2" style={{ color: 'var(--color-text-sub)' }}>適合スコア</h4>
          <div className="space-y-2">
            {(Object.keys(scores) as SystemId[]).map(id => {
              const sys = systems[id];
              const pct = maxScore > 0 ? (scores[id] / maxScore) * 100 : 0;
              const isW = id === winner;
              return (
                <div key={id}>
                  <div className="flex justify-between text-[13px] mb-1">
                    <span className={`flex items-center gap-1.5 ${isW ? 'font-black' : ''}`} style={{ color: isW ? sys.color : 'var(--color-text-sub)' }}>
                      {sys.name}
                      {isW && <span className="text-[13px] px-2 py-0.5 rounded-full font-black" style={{ background: sys.color + '15', color: sys.color }}>BEST</span>}
                    </span>
                    <span className="font-black">{scores[id]}pt</span>
                  </div>
                  <div className="score-bar-track">
                    <div className="score-bar-fill" style={{ width: `${pct}%`, background: sys.color, opacity: isW ? 1 : 0.35 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Button - bottom */}
      <div className="flex justify-center w-full max-w-xl mx-auto pt-4">
        <button onClick={onRestart} className="cta-btn px-10 py-3 text-sm">
          もう一度やり直す ↻
        </button>
      </div>
    </div>
  );
}
