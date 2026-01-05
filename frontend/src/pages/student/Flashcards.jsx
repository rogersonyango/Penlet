import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Plus, RotateCcw, Check, X, Trash2, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { flashcardsAPI, subjectsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function StudentFlashcards() {
  const [showCreate, setShowCreate] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [flippedCards, setFlippedCards] = useState({});
  const queryClient = useQueryClient();

  const { data: flashcards, isLoading } = useQuery({
    queryKey: ['flashcards'],
    queryFn: () => flashcardsAPI.list().then(res => res.data),
  });

  const { data: subjects } = useQuery({
    queryKey: ['my-subjects'],
    queryFn: () => subjectsAPI.mySubjects().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flashcardsAPI.create(data),
    onSuccess: () => {
      toast.success('Flashcard created!');
      queryClient.invalidateQueries(['flashcards']);
      setShowCreate(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create flashcard');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flashcardsAPI.delete(id),
    onSuccess: () => {
      toast.success('Flashcard deleted');
      queryClient.invalidateQueries(['flashcards']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete flashcard');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, wasCorrect }) => flashcardsAPI.review(id, { was_correct: wasCorrect }),
    onSuccess: () => queryClient.invalidateQueries(['flashcards']),
  });

  const handleReview = (wasCorrect) => {
    if (flashcards?.[currentIndex]) {
      reviewMutation.mutate({ id: flashcards[currentIndex].id, wasCorrect });
    }
    setFlipped(false);
    if (currentIndex < (flashcards?.length || 0) - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      toast.success('Study session complete!');
      setStudyMode(false);
      setCurrentIndex(0);
    }
  };

  const toggleCardFlip = (cardId) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Flashcards</h1>
          <p className="text-dark-400">Create and study with flashcards</p>
        </div>
        <div className="flex gap-2">
          {flashcards?.length > 0 && (
            <button 
              onClick={() => { setStudyMode(true); setCurrentIndex(0); setFlipped(false); }} 
              className="btn-secondary flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" /> Study Mode
            </button>
          )}
          <button onClick={() => setShowCreate(true)} className="btn-gradient flex items-center gap-2">
            <Plus className="w-5 h-5" /> Create
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : studyMode && flashcards?.length > 0 ? (
        /* Study Mode */
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-4">
            <span className="text-sm text-dark-400">{currentIndex + 1} / {flashcards.length}</span>
          </div>
          
          {/* Study Mode Flip Card */}
          <div 
            className="cursor-pointer"
            style={{ perspective: '1000px' }}
            onClick={() => setFlipped(!flipped)}
          >
            <motion.div
              className="relative w-full h-[300px]"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              {/* Front - Question */}
              <div 
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-600/20 to-accent-600/20 border border-primary-500/30 p-8 flex flex-col items-center justify-center"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <span className="text-xs uppercase tracking-wider text-primary-400 mb-4">Question</span>
                <p className="text-xl text-white text-center font-medium">{flashcards[currentIndex]?.question}</p>
                <span className="text-xs text-dark-500 mt-6">Click to reveal answer</span>
              </div>
              
              {/* Back - Answer */}
              <div 
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-600/20 to-highlight-600/20 border border-accent-500/30 p-8 flex flex-col items-center justify-center"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <span className="text-xs uppercase tracking-wider text-accent-400 mb-4">Answer</span>
                <p className="text-xl text-white text-center font-medium">{flashcards[currentIndex]?.answer}</p>
              </div>
            </motion.div>
          </div>
          
          <p className="text-center text-sm text-dark-500 mt-4">Click card to flip</p>
          
          {flipped && (
            <div className="flex justify-center gap-4 mt-6">
              <button onClick={() => handleReview(false)} className="btn-secondary flex items-center gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10">
                <X className="w-5 h-5" /> Incorrect
              </button>
              <button onClick={() => handleReview(true)} className="btn-gradient flex items-center gap-2">
                <Check className="w-5 h-5" /> Correct
              </button>
            </div>
          )}
          <div className="text-center mt-4">
            <button onClick={() => setStudyMode(false)} className="text-sm text-dark-400 hover:text-white">
              Exit Study Mode
            </button>
          </div>
        </div>
      ) : flashcards?.length > 0 ? (
        /* Flashcard Grid */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flashcards.map((card, i) => (
            <motion.div 
              key={card.id} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.05 }}
              className="group"
            >
              {/* Flip Card Container */}
              <div 
                className="cursor-pointer h-[220px]"
                style={{ perspective: '1000px' }}
                onClick={() => toggleCardFlip(card.id)}
              >
                <motion.div
                  className="relative w-full h-full"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateY: flippedCards[card.id] ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                >
                  {/* Front - Question */}
                  <div 
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-dark-800 to-dark-700 border border-dark-600 p-5 flex flex-col"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs uppercase tracking-wider text-primary-400 font-semibold">Question</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(card.id);
                        }}
                        className="p-1.5 text-dark-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-white font-medium flex-1 line-clamp-4">{card.question}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-600">
                      <div className="flex items-center gap-3 text-xs text-dark-500">
                        <span>Reviewed: {card.times_reviewed || 0}x</span>
                        <span>Correct: {card.times_correct || 0}x</span>
                      </div>
                      <RefreshCw className="w-4 h-4 text-dark-500" />
                    </div>
                  </div>
                  
                  {/* Back - Answer */}
                  <div 
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-900/50 to-accent-900/50 border border-primary-500/30 p-5 flex flex-col"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs uppercase tracking-wider text-accent-400 font-semibold">Answer</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(card.id);
                        }}
                        className="p-1.5 text-dark-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-white font-medium flex-1 line-clamp-4">{card.answer}</p>
                    <div className="flex items-center justify-end mt-3 pt-3 border-t border-primary-500/20">
                      <RefreshCw className="w-4 h-4 text-primary-400" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Layers className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400 mb-4">No flashcards yet. Create your first one!</p>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateFlashcardModal
            onClose={() => setShowCreate(false)}
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
            subjects={subjects}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateFlashcardModal({ onClose, onSubmit, isLoading, subjects }) {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onFormSubmit = (data) => {
    if (!data.subject_id) delete data.subject_id;
    onSubmit(data);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-dark-800 rounded-2xl border border-dark-700 shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">Create Flashcard</h2>
          <button onClick={onClose} className="p-2 text-dark-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="form-group">
            <label className="form-label">Question *</label>
            <textarea
              {...register('question', { required: 'Question is required' })}
              className="input-field resize-none"
              rows={3}
              placeholder="Enter your question..."
            />
            {errors.question && <p className="form-error">{errors.question.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Answer *</label>
            <textarea
              {...register('answer', { required: 'Answer is required' })}
              className="input-field resize-none"
              rows={3}
              placeholder="Enter the answer..."
            />
            {errors.answer && <p className="form-error">{errors.answer.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Subject (Optional)</label>
            <select {...register('subject_id')} className="input-field">
              <option value="">Select a subject</option>
              {subjects?.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn-gradient flex-1">
              {isLoading ? 'Creating...' : 'Create Flashcard'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}