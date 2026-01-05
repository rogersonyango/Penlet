import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Trophy, Zap, Brain, Calculator, Keyboard, X, Play, RotateCcw } from 'lucide-react';
import { gamesAPI } from '../../services/api';
import toast from 'react-hot-toast';

const GAMES = [
  {
    id: 'memory_match',
    name: 'Memory Match',
    description: 'Match pairs of cards to test your memory',
    icon: '🧠',
    color: 'from-purple-500/20 to-pink-500/20',
  },
  {
    id: 'quick_math',
    name: 'Quick Math',
    description: 'Solve math problems as fast as you can',
    icon: '🔢',
    color: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    id: 'word_scramble',
    name: 'Word Scramble',
    description: 'Unscramble letters to form words',
    icon: '📝',
    color: 'from-green-500/20 to-emerald-500/20',
  },
  {
    id: 'typing_race',
    name: 'Typing Race',
    description: 'Type words as fast as you can',
    icon: '⌨️',
    color: 'from-orange-500/20 to-yellow-500/20',
  },
];

export default function StudentGames() {
  const [activeGame, setActiveGame] = useState(null);
  const queryClient = useQueryClient();

  const { data: bestScores } = useQuery({
    queryKey: ['best-scores'],
    queryFn: () => gamesAPI.bestScores().then(res => res.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['game-stats'],
    queryFn: () => gamesAPI.stats().then(res => res.data),
  });

  const recordScoreMutation = useMutation({
    mutationFn: (data) => gamesAPI.recordScore(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['best-scores']);
      queryClient.invalidateQueries(['game-stats']);
    },
  });

  const handleGameEnd = (gameType, score, accuracy) => {
    recordScoreMutation.mutate({
      game_type: gameType,
      score,
      accuracy,
    });
    toast.success(`Game over! Score: ${score}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Learning Games</h1>
        <p className="text-dark-400">Have fun while learning!</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {GAMES.map((game, i) => {
          const score = bestScores?.[game.id];
          return (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setActiveGame(game.id)}
              className="dashboard-card group cursor-pointer hover:border-primary-500/50 transition-all"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition-transform`}>
                {game.icon}
              </div>
              <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors">
                {game.name}
              </h3>
              <p className="text-sm text-dark-400 mt-1">{game.description}</p>
              {score && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dark-700">
                  <Trophy className="w-4 h-4 text-highlight-400" />
                  <span className="text-sm text-dark-300">Best: {score.best_score}</span>
                </div>
              )}
              <button className="btn-gradient w-full mt-4 flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Play
              </button>
            </motion.div>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-card">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-highlight-400" /> Your Stats
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-xl bg-dark-700/30">
            <p className="text-3xl font-bold text-gradient">{stats?.total_games_played || 0}</p>
            <p className="text-sm text-dark-400">Total Games</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-dark-700/30">
            <p className="text-3xl font-bold text-gradient">{stats?.total_score || 0}</p>
            <p className="text-sm text-dark-400">Total Score</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-dark-700/30">
            <p className="text-3xl font-bold text-gradient">
              {stats?.average_accuracy ? `${Math.round(stats.average_accuracy)}%` : '-'}
            </p>
            <p className="text-sm text-dark-400">Avg Accuracy</p>
          </div>
        </div>
      </motion.div>

      {/* Game Modals */}
      <AnimatePresence>
        {activeGame === 'memory_match' && (
          <MemoryMatchGame onClose={() => setActiveGame(null)} onGameEnd={handleGameEnd} />
        )}
        {activeGame === 'quick_math' && (
          <QuickMathGame onClose={() => setActiveGame(null)} onGameEnd={handleGameEnd} />
        )}
        {activeGame === 'word_scramble' && (
          <WordScrambleGame onClose={() => setActiveGame(null)} onGameEnd={handleGameEnd} />
        )}
        {activeGame === 'typing_race' && (
          <TypingRaceGame onClose={() => setActiveGame(null)} onGameEnd={handleGameEnd} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Memory Match Game
function MemoryMatchGame({ onClose, onGameEnd }) {
  const emojis = ['🍎', '🍊', '🍋', '🍇', '🍓', '🫐', '🥝', '🍑'];
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    const shuffled = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji }));
    setCards(shuffled);
  }, []);

  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0) {
      setGameOver(true);
      const score = Math.max(1000 - moves * 20, 100);
      const accuracy = Math.round((cards.length / 2 / moves) * 100);
      onGameEnd('memory_match', score, accuracy);
    }
  }, [matched, cards.length, moves]);

  const handleCardClick = (id) => {
    if (flipped.length === 2 || flipped.includes(id) || matched.includes(id)) return;
    
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      if (cards[first].emoji === cards[second].emoji) {
        setMatched([...matched, first, second]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <GameModal title="Memory Match" onClose={onClose}>
      <div className="text-center mb-4">
        <span className="text-dark-400">Moves: {moves}</span>
        <span className="mx-4 text-dark-600">|</span>
        <span className="text-dark-400">Matched: {matched.length / 2} / {emojis.length}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
        {cards.map((card) => (
          <motion.button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            className={`aspect-square rounded-lg text-2xl flex items-center justify-center transition-all ${
              flipped.includes(card.id) || matched.includes(card.id)
                ? 'bg-primary-500/20'
                : 'bg-dark-700 hover:bg-dark-600'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {(flipped.includes(card.id) || matched.includes(card.id)) ? card.emoji : '?'}
          </motion.button>
        ))}
      </div>
      {gameOver && (
        <div className="text-center mt-6">
          <p className="text-xl font-bold text-white mb-2">🎉 Congratulations!</p>
          <p className="text-dark-400">You completed it in {moves} moves</p>
        </div>
      )}
    </GameModal>
  );
}

// Quick Math Game
function QuickMathGame({ onClose, onGameEnd }) {
  const [problem, setProblem] = useState(null);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  const generateProblem = useCallback(() => {
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, result;
    
    if (op === '+') {
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      result = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * a);
      result = a - b;
    } else {
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      result = a * b;
    }
    
    setProblem({ a, b, op, result });
  }, []);

  useEffect(() => {
    generateProblem();
  }, [generateProblem]);

  useEffect(() => {
    if (timeLeft <= 0) {
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      onGameEnd('quick_math', score, accuracy);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, score, correct, total]);

  const checkAnswer = () => {
    setTotal(t => t + 1);
    if (parseInt(answer) === problem.result) {
      setScore(s => s + 10);
      setCorrect(c => c + 1);
      toast.success('+10 points!', { duration: 500 });
    } else {
      toast.error('Wrong!', { duration: 500 });
    }
    setAnswer('');
    generateProblem();
  };

  if (timeLeft <= 0) {
    return (
      <GameModal title="Quick Math" onClose={onClose}>
        <div className="text-center py-8">
          <p className="text-4xl font-bold text-white mb-2">{score}</p>
          <p className="text-dark-400">Final Score</p>
          <p className="text-sm text-dark-500 mt-2">{correct} / {total} correct</p>
        </div>
      </GameModal>
    );
  }

  return (
    <GameModal title="Quick Math" onClose={onClose}>
      <div className="flex justify-between mb-6">
        <span className="text-dark-400">Score: <span className="text-white font-bold">{score}</span></span>
        <span className={`font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</span>
      </div>
      <div className="text-center py-8">
        <p className="text-4xl font-bold text-white mb-6">
          {problem?.a} {problem?.op} {problem?.b} = ?
        </p>
        <input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
          className="input-field text-center text-2xl w-32 mx-auto"
          autoFocus
        />
        <button onClick={checkAnswer} className="btn-gradient mt-4 w-32">
          Submit
        </button>
      </div>
    </GameModal>
  );
}

// Word Scramble Game
function WordScrambleGame({ onClose, onGameEnd }) {
  const words = ['LEARN', 'STUDY', 'SCHOOL', 'TEACHER', 'STUDENT', 'BOOK', 'PENCIL', 'MATH', 'SCIENCE', 'HISTORY'];
  const [currentWord, setCurrentWord] = useState('');
  const [scrambled, setScrambled] = useState('');
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [correct, setCorrect] = useState(0);
  const maxRounds = 5;

  const scrambleWord = useCallback((word) => {
    return word.split('').sort(() => Math.random() - 0.5).join('');
  }, []);

  const nextWord = useCallback(() => {
    const word = words[Math.floor(Math.random() * words.length)];
    setCurrentWord(word);
    setScrambled(scrambleWord(word));
    setGuess('');
  }, []);

  useEffect(() => {
    nextWord();
  }, []);

  const checkGuess = () => {
    if (guess.toUpperCase() === currentWord) {
      setScore(s => s + 20);
      setCorrect(c => c + 1);
      toast.success('+20 points!', { duration: 500 });
    } else {
      toast.error(`It was: ${currentWord}`, { duration: 1500 });
    }
    
    if (round >= maxRounds) {
      const accuracy = Math.round((correct + (guess.toUpperCase() === currentWord ? 1 : 0)) / maxRounds * 100);
      setTimeout(() => onGameEnd('word_scramble', score + (guess.toUpperCase() === currentWord ? 20 : 0), accuracy), 500);
    } else {
      setRound(r => r + 1);
      nextWord();
    }
  };

  return (
    <GameModal title="Word Scramble" onClose={onClose}>
      <div className="flex justify-between mb-6">
        <span className="text-dark-400">Score: <span className="text-white font-bold">{score}</span></span>
        <span className="text-dark-400">Round: {round} / {maxRounds}</span>
      </div>
      <div className="text-center py-8">
        <p className="text-4xl font-bold text-primary-400 tracking-widest mb-6">{scrambled}</p>
        <input
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && checkGuess()}
          className="input-field text-center text-xl w-48 mx-auto uppercase"
          placeholder="Your answer"
          autoFocus
        />
        <button onClick={checkGuess} className="btn-gradient mt-4 w-32">
          Submit
        </button>
      </div>
    </GameModal>
  );
}

// Typing Race Game
function TypingRaceGame({ onClose, onGameEnd }) {
  const sentences = [
    'The quick brown fox jumps over the lazy dog',
    'Practice makes perfect in everything we do',
    'Learning is a journey not a destination',
    'Education is the key to success in life',
    'Knowledge is power that cannot be stolen',
  ];
  const [text, setText] = useState('');
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [wordsTyped, setWordsTyped] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setText(sentences[Math.floor(Math.random() * sentences.length)]);
  }, []);

  useEffect(() => {
    if (!started || timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [started, timeLeft]);

  useEffect(() => {
    if (timeLeft <= 0 && started) {
      const wpm = wordsTyped;
      onGameEnd('typing_race', wpm * 10, 100);
    }
  }, [timeLeft, started, wordsTyped]);

  const handleInput = (e) => {
    if (!started) setStarted(true);
    const value = e.target.value;
    setInput(value);
    
    if (value === text) {
      setWordsTyped(w => w + text.split(' ').length);
      setText(sentences[Math.floor(Math.random() * sentences.length)]);
      setInput('');
    }
  };

  if (timeLeft <= 0 && started) {
    return (
      <GameModal title="Typing Race" onClose={onClose}>
        <div className="text-center py-8">
          <p className="text-4xl font-bold text-white mb-2">{wordsTyped} WPM</p>
          <p className="text-dark-400">Words Per Minute</p>
        </div>
      </GameModal>
    );
  }

  return (
    <GameModal title="Typing Race" onClose={onClose}>
      <div className="flex justify-between mb-6">
        <span className="text-dark-400">Words: <span className="text-white font-bold">{wordsTyped}</span></span>
        <span className={`font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</span>
      </div>
      <div className="py-4">
        <p className="text-lg text-dark-300 mb-4 p-4 rounded-lg bg-dark-700/50">
          {text.split('').map((char, i) => (
            <span
              key={i}
              className={
                i < input.length
                  ? input[i] === char
                    ? 'text-green-400'
                    : 'text-red-400 bg-red-400/20'
                  : ''
              }
            >
              {char}
            </span>
          ))}
        </p>
        <input
          type="text"
          value={input}
          onChange={handleInput}
          className="input-field w-full text-lg"
          placeholder={started ? 'Keep typing...' : 'Start typing to begin...'}
          autoFocus
        />
      </div>
    </GameModal>
  );
}

// Reusable Game Modal
function GameModal({ title, onClose, children }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md bg-dark-800 rounded-2xl border border-dark-700 shadow-2xl z-50"
      >
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-2 text-dark-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </motion.div>
    </>
  );
}