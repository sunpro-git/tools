import { useState, useCallback, useEffect } from 'react';
import { questions } from './data/questions';
import type { SystemId } from './data/systems';
import { generateLabel, type SimConfig, type SimEntry } from './data/simulation';
import type { YearlyUnitConfig } from './data/costConfig';
import { SlideContainer } from './components/SlideContainer';
import { TopSlide } from './components/TopSlide';
import { QuestionSlide } from './components/QuestionSlide';
import { ResultSlide } from './components/ResultSlide';
import { SystemInfoSlide } from './components/SystemInfoSlide';
import { ComparisonSlide } from './components/ComparisonSlide';
import { SimulationSlide } from './components/SimulationSlide';
import { AdminPage } from './components/admin/AdminPage';

type Route = 'top' | 'info' | 'quiz' | 'admin';

const infoSystems: SystemId[] = ['myroom', 'smart', 'zenkan'];

// URL sharing helpers
function decodeSimEntries(hash: string): SimEntry[] | null {
  try {
    const match = hash.match(/^#sim=(.+)$/);
    if (!match) return null;
    return JSON.parse(decodeURIComponent(atob(match[1])));
  } catch { return null; }
}

function App() {
  const [route, setRoute] = useState<Route>(() => {
    const hash = window.location.hash;
    if (hash === '#admin') return 'admin';
    if (hash.startsWith('#sim=')) return 'info';
    return 'top';
  });
  const [step, setStep] = useState(() => {
    return window.location.hash.startsWith('#sim=') ? 3 : 0; // go to simulation page
  });

  // Hash-based routing
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#admin') setRoute('admin');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(questions.length).fill(null)
  );
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [simEntries, setSimEntries] = useState<SimEntry[]>(() => {
    return decodeSimEntries(window.location.hash) ?? [];
  });

  const slideKey = route === 'top' ? 0 : route === 'info' ? 100 + step : 200 + step;

  const goTo = useCallback((r: Route, s: number, dir: 'forward' | 'back' = 'forward') => {
    setDirection(dir);
    setRoute(r);
    setStep(s);
  }, []);

  const handleInfo = useCallback(() => goTo('info', 0), [goTo]);
  const handleQuiz = useCallback(() => goTo('quiz', 0), [goTo]);
  const handleTop = useCallback(() => {
    setDirection('back');
    setRoute('top');
    setStep(0);
    setAnswers(Array(questions.length).fill(null));
  }, []);

  const handleInfoNext = useCallback(() => {
    setDirection('forward');
    setStep(s => s + 1);
  }, []);
  const handleInfoBack = useCallback(() => {
    if (step === 0) handleTop();
    else { setDirection('back'); setStep(s => s - 1); }
  }, [step, handleTop]);

  const handleSelect = useCallback(
    (questionIndex: number, choiceIndex: number) => {
      setAnswers(prev => {
        const next = [...prev];
        next[questionIndex] = choiceIndex;
        return next;
      });
    },
    []
  );

  const handleQuizNext = useCallback(() => {
    if (answers[step] !== null) {
      setDirection('forward');
      setStep(s => s + 1);
    }
  }, [step, answers]);

  const handleQuizBack = useCallback(() => {
    if (step === 0) handleTop();
    else { setDirection('back'); setStep(s => s - 1); }
  }, [step, handleTop]);

  const handleRestart = useCallback(() => handleTop(), [handleTop]);

  const handleAddSimulation = useCallback((systemId: SystemId, config: SimConfig[SystemId], yearlyConfigs?: YearlyUnitConfig[]) => {
    setSimEntries(prev => {
      if (prev.length >= 5) return prev;
      const label = generateLabel(systemId, config, prev);
      const id = `${systemId}-${Date.now()}`;
      return [...prev, { id, systemId, label, config, yearlyConfigs }];
    });
  }, []);

  const handleRemoveSimulation = useCallback((id: string) => {
    setSimEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const isQuizQuestion = route === 'quiz' && step < questions.length;
  const isQuizResult = route === 'quiz' && step === questions.length;
  const isInfoSystem = route === 'info' && step < 3;
  const isInfoSimulation = route === 'info' && step === 3;
  const isInfoComparison = route === 'info' && step === 4;

  const progressCurrent = step + 1;
  const progressTotal = route === 'quiz' ? questions.length : 5;

  // Admin page
  if (route === 'admin') {
    return (
      <AdminPage onBack={() => { window.location.hash = ''; setRoute('top'); }} />
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="paper-bg" />

      <div className="relative z-[1] h-full">
        <SlideContainer slideKey={slideKey} direction={direction}>
          {route === 'top' && (
            <TopSlide onInfo={handleInfo} onQuiz={handleQuiz} />
          )}

          {isInfoSystem && (
            <SystemInfoSlide
              systemId={infoSystems[step]}
              onNext={handleInfoNext}
              onBack={handleInfoBack}
              onAddSimulation={handleAddSimulation}
              onRemoveSimulation={handleRemoveSimulation}
              simEntries={simEntries}
              progressCurrent={progressCurrent}
              progressTotal={progressTotal}
            />
          )}

          {isInfoSimulation && (
            <SimulationSlide
              entries={simEntries}
              onRemove={handleRemoveSimulation}
              onQuiz={handleInfoNext}
              onBack={() => { setDirection('back'); setStep(2); }}
              onTop={handleTop}
            />
          )}

          {isInfoComparison && (
            <ComparisonSlide
              onQuiz={() => goTo('quiz', 0)}
              onBack={() => { setDirection('back'); setStep(3); }}
            />
          )}

          {isQuizQuestion && (
            <QuestionSlide
              question={questions[step]}
              selectedIndex={answers[step]}
              onSelect={(choiceIndex) => handleSelect(step, choiceIndex)}
              onNext={handleQuizNext}
              onBack={handleQuizBack}
              onTop={handleTop}
              isFirst={step === 0}
              progressCurrent={progressCurrent}
              progressTotal={progressTotal}
            />
          )}

          {isQuizResult && (
            <ResultSlide
              answers={answers as number[]}
              onRestart={handleRestart}
            />
          )}
        </SlideContainer>
      </div>
    </div>
  );
}

export default App;
