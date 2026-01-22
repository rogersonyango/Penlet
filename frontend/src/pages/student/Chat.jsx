import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Bot, User, Loader2, Sparkles, BookOpen, 
  Trash2, ChevronDown, AlertCircle 
} from 'lucide-react';
import { chatAPI, subjectsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

export default function StudentChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showSubjectSelect, setShowSubjectSelect] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch subjects for context
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsAPI.list().then(res => res.data),
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to chat
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await chatAPI.send({
        message: userMessage,
        conversation_history: messages.slice(-10), // Send last 10 messages for context
        subject_context: selectedSubject || null,
      });

      // Add assistant response
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: response.data.response 
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to get response. Please try again.';
      toast.error(errorMessage);
      
      // Add error message to chat
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: "I'm sorry, I encountered an error. Please try again.",
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  const suggestedQuestions = [
    "Explain photosynthesis in simple terms",
    "How do I solve quadratic equations?",
    "What caused World War II?",
    "Help me understand Newton's laws of motion",
    "What are the parts of a cell?",
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Penlet AI</h1>
            <p className="text-sm text-dark-400">Your study assistant</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Subject Context Selector */}
          <div className="relative">
            <button
              onClick={() => setShowSubjectSelect(!showSubjectSelect)}
              className="flex items-center gap-2 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-300 hover:text-white hover:border-dark-600 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              {selectedSubject || 'All subjects'}
              <ChevronDown className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
              {showSubjectSelect && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-48 py-2 bg-dark-800 border border-dark-700 rounded-xl shadow-xl z-10"
                >
                  <button
                    onClick={() => { setSelectedSubject(''); setShowSubjectSelect(false); }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-dark-700 transition-colors ${!selectedSubject ? 'text-primary-400' : 'text-dark-300'}`}
                  >
                    All subjects
                  </button>
                  {subjects?.map(subject => (
                    <button
                      key={subject.id}
                      onClick={() => { setSelectedSubject(subject.name); setShowSubjectSelect(false); }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-dark-700 transition-colors ${selectedSubject === subject.name ? 'text-primary-400' : 'text-dark-300'}`}
                    >
                      {subject.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Clear Chat */}
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-2 text-dark-400 hover:text-red-400 transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl bg-dark-800/50 border border-dark-700/50 p-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-primary-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">How can I help you today?</h2>
            <p className="text-dark-400 mb-6 max-w-md">
              I'm here to help you with your studies. Ask me anything about your subjects!
            </p>
            
            {/* Suggested Questions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestedQuestions.map((question, i) => (
                <button
                  key={i}
                  onClick={() => setInput(question)}
                  className="px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-lg text-sm text-dark-300 hover:text-white hover:border-primary-500/50 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : message.isError
                      ? 'bg-red-500/20 border border-red-500/30 text-red-200'
                      : 'bg-dark-700 text-dark-100'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          code: ({ inline, children }) => 
                            inline 
                              ? <code className="bg-dark-600 px-1 rounded">{children}</code>
                              : <pre className="bg-dark-600 p-2 rounded-lg overflow-x-auto"><code>{children}</code></pre>,
                          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
                
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-dark-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-dark-300" />
                  </div>
                )}
              </motion.div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-dark-700 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-dark-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="mt-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your studies..."
              rows={1}
              className="input-field pr-12 resize-none min-h-[48px] max-h-32"
              style={{ height: 'auto' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="btn-gradient px-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-dark-500 mt-2 text-center">
          Penlet AI can make mistakes. Verify important information with your teacher.
        </p>
      </div>
    </div>
  );
}