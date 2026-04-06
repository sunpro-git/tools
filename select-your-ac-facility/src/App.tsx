import { useState, useCallback } from 'react';
import { questions } from './data/questions';
import type { SystemId } from './data/systems';
import { generateLabel, type SimConfig, type SimEntry } from './data/simulation';
import { SlideContainer } from './components/SlideContainer';
import { TopSlide } from './components/TopSlide';
import { QuestionSlide } from './components/QuestionSlide';
import { ResultSlide } from './components/ResultSlide';
import { SystemInfoSlide } from './components/SystemInfoSlide';
import { ComparisonSlide } from './components/ComparisonSlide';
import { SimulationSlide } from './components/SimulationSlide';
import { ProgressBar } from './components/ProgressBar';

type Route = 'top' | 'info' | 'quiz';

const infoSystems: SystemId[] = ['myroom', 'smart', 'zenkan'];

function App() {
  const [route, setRoute] = useState<Route>('top');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(questions.length).fill(null)
  );
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [simEntries, setSimEntries] = useState<SimEntry[]>([]);

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

  const handleAddSimulation = useCallback((systemId: SystemId, config: SimConfig[SystemId]) => {
    setSimEntries(prev => {
      if (prev.length >= 5) return prev;
      const label = generateLabel(systemId, config, prev);
      const id = `${systemId}-${Date.now()}`;
      return [...prev, { id, systemId, label, config }];
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

  const showProgress = isQuizQuestion || (route === 'info' && step <= 4);
  const progressCurrent = step + 1;
  const progressTotal = route === 'quiz' ? questions.length : 5;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="paper-bg" />

      {showProgress && (
        <div className="absolute top-0 left-0 right-0 z-10 p-6">
          <ProgressBar current={progressCurrent} total={progressTotal} />
        </div>
      )}

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
