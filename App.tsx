
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, AnimationType } from './types';
import { sendMessage } from './services/geminiService';
import { INITIAL_GREETING } from './constants.tsx';
import Avatar from './components/Avatar';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: INITIAL_GREETING.replace(/\[ANIMATION: \w+\]\s*/, ''),
      animation: 'wave_hand',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<AnimationType>('wave_hand');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const parseAnimation = (text: string): { animation: AnimationType; cleanText: string } => {
    const animationMatch = text.match(/\[ANIMATION: (\w+)\]/);
    let animation: AnimationType = 'idle';
    let cleanText = text;

    if (animationMatch) {
      const animName = animationMatch[1] as AnimationType;
      animation = animName;
      cleanText = text.replace(animationMatch[0], '').trim();
    }

    return { animation, cleanText };
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setCurrentAnimation('thinking');

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }]
      }));

      const { text, sources } = await sendMessage(inputValue, history);
      const { animation, cleanText } = parseAnimation(text);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanText,
        animation,
        timestamp: new Date(),
        sources
      };

      setMessages(prev => [...prev, aiMessage]);
      setCurrentAnimation(animation);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: 'err',
        role: 'assistant',
        content: "I'm having trouble connecting to the news feed. Please try again in a moment.",
        animation: 'warning',
        timestamp: new Date()
      }]);
      setCurrentAnimation('warning');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-6xl mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">REFUGE AI HELP</h1>
            <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">Verified News & Support</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1 glass rounded-full text-xs font-medium text-emerald-400">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
          LIVE FEED CONNECTED
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row gap-8 overflow-hidden">
        {/* Left Side: Avatar & System Stats */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-8 min-h-[300px]">
          <Avatar animation={currentAnimation} />
          
          <div className="w-full max-w-sm space-y-4">
            <div className="glass rounded-2xl p-4 text-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400">Status</span>
                <span className="text-emerald-400 font-semibold">Operational</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Latency</span>
                <span className="text-slate-200">24ms</span>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-slate-500 italic">"Integrity is the bedrock of information."</p>
            </div>
          </div>
        </div>

        {/* Right Side: Chat Panel */}
        <div className="flex-[1.5] glass rounded-3xl flex flex-col overflow-hidden shadow-2xl relative">
          {/* Blur Orbs */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-600/10 blur-3xl rounded-full"></div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified Sources</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((source, idx) => (
                          <a
                            key={idx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-slate-700 hover:bg-slate-600 text-blue-300 px-2 py-1 rounded transition-colors truncate max-w-[150px]"
                          >
                            {source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-[10px] text-slate-400 mt-2 text-right">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl rounded-tl-none p-4 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about verified news or humanitarian status..."
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
              />
              <button
                onClick={handleSend}
                disabled={isTyping || !inputValue.trim()}
                className="absolute right-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              Responses are grounded in verified Google Search results. Use for humanitarian assistance and news verification only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
