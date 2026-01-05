import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Bot, User, Loader2 } from 'lucide-react';
import { chatAPI } from '../../services/api';

export default function StudentChat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  const sendMutation = useMutation({
    mutationFn: (data) => chatAPI.send(data).then(res => res.data),
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      setSessionId(data.session_id);
    },
  });

  const handleSend = () => {
    if (!message.trim() || sendMutation.isPending) return;
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    sendMutation.mutate({ message, session_id: sessionId });
    setMessage('');
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">AI Study Assistant</h1>
        <p className="text-dark-400">Get help with your studies</p>
      </div>

      <div className="flex-1 dashboard-card flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 text-primary-500/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">How can I help you today?</h3>
              <p className="text-dark-400 text-sm max-w-md mx-auto">Ask me about study tips, subject help, exam preparation, or any educational topic!</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-400" />
                </div>
              )}
              <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-100'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-accent-400" />
                </div>
              )}
            </motion.div>
          ))}
          {sendMutation.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
              </div>
              <div className="bg-dark-700 p-3 rounded-xl"><p className="text-sm text-dark-400">Thinking...</p></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-dark-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              className="input-field flex-1"
            />
            <button onClick={handleSend} disabled={sendMutation.isPending || !message.trim()} className="btn-gradient px-4">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
