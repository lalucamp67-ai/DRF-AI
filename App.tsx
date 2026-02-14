
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, AnimationType, ModelTier, LogEntry, ViewMode, UserTier, PaymentCountry, VoiceLinkSettings, VoiceName, LiveConversationMode, PaymentMethod } from './types';
import { sendMessage, generateImage, generateVideo } from './services/geminiService';
import { INITIAL_GREETING, LANGUAGE_PRESETS } from './constants.tsx';
import Avatar from './components/Avatar';
import { useGeminiLive } from './hooks/useGeminiLive';

type PaymentStep = 'plan' | 'country' | 'method' | 'details' | 'processing' | 'success';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<AnimationType>('smile');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{data: string, mimeType: string} | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [userTier, setUserTier] = useState<UserTier>('free');
  
  // Payment Flow States
  const [showPayModal, setShowPayModal] = useState(false);
  const [payStep, setPayStep] = useState<PaymentStep>('plan');
  const [selectedCountry, setSelectedCountry] = useState<PaymentCountry>('GLOBAL');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('stripe');
  const [phoneInput, setPhoneInput] = useState('');
  
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [isFixing, setIsFixing] = useState(false);
  
  const [voiceSettings, setVoiceSettings] = useState<VoiceLinkSettings>(() => {
    const saved = localStorage.getItem('rr_drf_voice_settings');
    return saved ? JSON.parse(saved) : { voice: 'Zephyr', mode: 'standard' };
  });

  const [draftUserTranscription, setDraftUserTranscription] = useState('');
  const [draftAssistantTranscription, setDraftAssistantTranscription] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTier = localStorage.getItem('rr_drf_tier') as UserTier;
    if (savedTier) setUserTier(savedTier);
    
    const checkKey = async () => {
      const selected = await (window as any).aistudio?.hasSelectedApiKey();
      setHasApiKey(!!selected);
    };
    checkKey();

    setMessages([{
      id: '1',
      role: 'assistant',
      content: INITIAL_GREETING.replace(/\[ANIMATION: \w+\]\s*/, ''),
      animation: 'smile',
      timestamp: new Date(),
      modelUsed: 'system'
    }]);
  }, []);

  useEffect(() => {
    localStorage.setItem('rr_drf_voice_settings', JSON.stringify(voiceSettings));
  }, [voiceSettings]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, draftUserTranscription, draftAssistantTranscription]);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-15), { id: Math.random().toString(), timestamp: new Date(), message, type }]);
  }, []);

  const handleProcessPayment = async () => {
    setPayStep('processing');
    setDiagnosticLogs(["Connecting to Regional Gateway...", "Authenticating Wallet...", "Securing Transaction..."]);
    
    await new Promise(r => setTimeout(r, 2000));
    
    setDiagnosticLogs(prev => [...prev, "Payment Verified.", "Uplinking Neural Modules...", "Tier Upgrade Finalized."]);
    await new Promise(r => setTimeout(r, 1000));

    setUserTier('premium');
    localStorage.setItem('rr_drf_tier', 'premium');
    setPayStep('success');
    addLog(`Neural Pro activated via ${payMethod.toUpperCase()}.`, "success");
  };

  const handleSend = async (overrideValue?: string) => {
    const messageToSend = overrideValue || inputValue;
    if ((!messageToSend.trim() && !selectedFile) || isTyping) return;

    // Detect feature requirements
    const isVideoReq = messageToSend.toLowerCase().includes('generate video');
    const isImageReq = messageToSend.toLowerCase().includes('generate image');
    const isSearchReq = messageToSend.toLowerCase().includes('search') || messageToSend.toLowerCase().includes('news');
    const isThinkingReq = messageToSend.toLowerCase().includes('think') || messageToSend.length > 200;

    // GATING
    if (userTier === 'free' && (isVideoReq || isImageReq || isSearchReq)) {
      addLog("Premium Tier required for advanced synthesis & search.", "error");
      setPayStep('plan');
      setShowPayModal(true);
      return;
    }
    
    const userMessage: Message = {
      id: Date.now().toString(), role: 'user', content: messageToSend || "[Media]",
      imageUrl: selectedFile?.mimeType.startsWith('image') ? `data:${selectedFile.mimeType};base64,${selectedFile.data}` : undefined,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setCurrentAnimation('thinking');
    
    try {
      let res: any;
      if (isVideoReq) {
        res = { text: "[ANIMATION: wave_hand] Processing neural video frame...", videoUrl: await generateVideo(messageToSend, selectedFile?.data, selectedFile?.mimeType, "16:9") };
      } else if (isImageReq) {
        res = { text: "[ANIMATION: nod_yes] Neural frame synthesized.", imageUrl: await generateImage(messageToSend, "1:1") };
      } else {
        const history = messages.map(m => ({ role: m.role === 'user' ? 'user' as const : 'model' as const, parts: [{ text: m.content }] }));
        
        let tierToUse: ModelTier = 'gemini-2.5-flash-lite';
        if (userTier === 'premium') {
          if (isSearchReq) tierToUse = 'gemini-3-flash-preview';
          else if (isThinkingReq) tierToUse = 'gemini-3-pro-preview';
        }

        res = await sendMessage(userMessage.content, history, tierToUse, userTier, selectedFile || undefined);
      }
      
      const animMatch = res.text.match(/\[ANIMATION: (\w+)\]/);
      const clean = res.text.replace(/\[ANIMATION: \w+\]/g, '').trim();
      const anim = (animMatch?.[1] as AnimationType) || 'idle';
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant', content: clean,
        animation: anim, timestamp: new Date(), sources: res.sources,
        imageUrl: res.imageUrl, videoUrl: res.videoUrl, modelUsed: res.modelUsed
      }]);
      setCurrentAnimation(anim);
    } catch (e: any) {
      addLog(`Error: ${e.message}`, 'error');
    } finally {
      setIsTyping(false);
      setSelectedFile(null);
    }
  };

  const { start: startLive, stop: stopLive } = useGeminiLive({
    onTranscription: (text, role) => {
      if (role === 'user') {
        setDraftUserTranscription(text);
        setCurrentAnimation('thinking');
      } else {
        setDraftAssistantTranscription(text);
        setCurrentAnimation('nod_yes');
      }
    },
    onTurnComplete: (u, a) => {
      if (u || a) {
        setMessages(prev => [...prev, 
          { id: Date.now().toString(), role: 'user', content: u || "...", timestamp: new Date() },
          { id: (Date.now() + 1).toString(), role: 'assistant', content: a || "...", timestamp: new Date(), modelUsed: 'gemini-live' }
        ]);
      }
      setDraftUserTranscription('');
      setDraftAssistantTranscription('');
      setCurrentAnimation('smile');
    },
    onLog: (m, t) => addLog(m, t),
    onStateChange: (active) => setIsLiveMode(active)
  });

  const getMethodsForCountry = (country: PaymentCountry) => {
    const global = [
      { id: 'stripe', label: 'Stripe / Card', icon: '💳' },
      { id: 'paypal', label: 'PayPal', icon: '🅿️' }
    ];
    switch(country) {
      case 'MY': return [...global, { id: 'tng', label: 'Touch \'n Go', icon: '📱' }, { id: 'grabpay', label: 'GrabPay', icon: '🟢' }];
      case 'ID': return [...global, { id: 'gopay', label: 'GoPay', icon: '🔵' }, { id: 'ovo', label: 'OVO', icon: '🟣' }];
      case 'MM': return [...global, { id: 'kbzpay', label: 'KBZPay', icon: '💎' }, { id: 'wavepay', label: 'WavePay', icon: '🌊' }];
      default: return [...global, { id: 'crypto', label: 'Crypto', icon: '🪙' }];
    }
  };

  return (
    <div className={`flex flex-col h-screen max-w-full mx-auto overflow-hidden text-slate-100 relative transition-colors duration-1000 ${
      viewMode === 'vr' ? 'bg-[#100821]' : viewMode === 'ar' ? 'bg-[#0a1a1f]' : 'bg-[#050b18]'
    }`}>
      
      {/* Background Spatial Effects */}
      {viewMode === 'vr' && <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(139,92,246,0.1)_0%,_transparent_100%)]"></div>}
      {viewMode === 'ar' && <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #00f2ff 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>}

      {/* NAVIGATION BAR */}
      <nav className="flex items-center justify-between px-4 md:px-8 py-4 glass z-50 sticky top-0 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.4)]">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight uppercase tracking-tighter gemini-gradient">RR.DRF INTELLIGENCE</h1>
            <div className="flex gap-2 items-center">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full uppercase text-[9px] font-black tracking-widest transition-all ${userTier === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-white/10 text-slate-400'}`}>
                {userTier === 'premium' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>}
                {userTier === 'premium' ? 'NEURAL PRO' : 'FREE LINK'}
              </div>
              <button onClick={() => { setPayStep('plan'); setShowPayModal(true); }} className="text-[9px] text-blue-400 font-bold hover:underline">
                {userTier === 'free' ? 'Upgrade?' : 'Manage Plan'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* VIEW MODE TOGGLE */}
          <div className="hidden md:flex glass rounded-xl p-1 gap-1 mr-4">
            {(['standard', 'ar', 'vr'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                  viewMode === v ? 'bg-white/20 text-white' : 'text-slate-500 hover:text-white'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button onClick={() => setShowVoiceSettings(true)} className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700 text-slate-400 transition-colors relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {userTier === 'premium' && <span className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full border border-slate-900"></span>}
          </button>
          <button onClick={() => isLiveMode ? stopLive() : startLive(voiceSettings)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all transform active:scale-95 shadow-xl flex items-center gap-2 ${isLiveMode ? 'bg-red-500 animate-pulse text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
            {isLiveMode ? 'STOP LIVE' : 'VOICE LINK'}
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* AVATAR CENTER */}
        <div className={`absolute left-1/2 -translate-x-1/2 z-0 transition-all duration-1000 ${
          viewMode === 'vr' ? 'top-1/4 scale-125 mt-0' : viewMode === 'ar' ? 'top-1/3 scale-110 mt-0' : 'top-0 mt-12'
        }`}>
          <Avatar animation={currentAnimation} mode={viewMode} />
        </div>

        {/* CHAT INTERFACE */}
        <div className={`flex-1 overflow-y-auto pb-44 px-4 md:px-8 space-y-8 no-scrollbar relative z-10 transition-all duration-700 ${
          viewMode !== 'standard' ? 'pt-[80vh] opacity-80' : 'pt-72'
        }`}>
          <div className="max-w-3xl mx-auto space-y-10">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-6 duration-700`}>
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[90%]`}>
                  <div className={`p-5 rounded-3xl shadow-2xl relative ${
                    msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-900/20' : 'glass rounded-tl-none border-white/5 border'
                  }`}>
                    <div className="text-[14px] leading-relaxed font-semibold">{msg.content}</div>
                    {msg.imageUrl && <img src={msg.imageUrl} className="w-full max-w-xs rounded-2xl mt-4 border border-white/10 shadow-lg" />}
                    {msg.videoUrl && <video src={msg.videoUrl} controls className="w-full max-w-xs rounded-2xl mt-4 border border-white/10 shadow-lg" />}
                  </div>
                  {msg.modelUsed && <div className="text-[8px] mt-1 text-slate-500 font-black uppercase tracking-widest px-1">via {msg.modelUsed}</div>}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* INPUT SECTION */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-50 bg-gradient-to-t from-[#050b18] via-[#050b18]/95 to-transparent">
          <div className="max-w-3xl mx-auto glass rounded-3xl p-2.5 flex items-center gap-4 border border-white/10 shadow-3xl focus-within:border-blue-500/30">
            <input 
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSend()} 
              placeholder="Ask RR.DRF Intelligence anything..." 
              className="flex-1 bg-transparent border-none outline-none text-[14px] px-4 py-3 font-bold" 
            />
            <button onClick={() => handleSend()} disabled={isTyping} className="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-full transition-all active:scale-90 shadow-lg shadow-blue-600/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* PAYMENT MODAL (REUSE EXISTING INFRA FOR TIER SYSTEM) */}
      {showPayModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] max-w-xl w-full shadow-3xl space-y-6 animate-in zoom-in duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[120px] rounded-full -mr-20 -mt-20"></div>
            
            <div className="flex justify-between items-center relative z-10">
              <h2 className="text-xl font-black uppercase tracking-tighter gemini-gradient">
                {payStep === 'success' ? 'Link Secured' : 'Neural Pro Activation'}
              </h2>
              <button onClick={() => setShowPayModal(false)} className="text-slate-500 hover:text-white p-2">✕</button>
            </div>

            {payStep === 'plan' && (
              <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4">
                <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-3xl space-y-4">
                  <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Premium Link Benefits</div>
                  <ul className="text-[11px] text-slate-300 space-y-3 font-medium">
                    <li className="flex items-center gap-2"><span className="text-amber-500">✨</span> 4K Ultra Video & Image Synthesis</li>
                    <li className="flex items-center gap-2"><span className="text-blue-400">🌍</span> Real-time Global News Grounding</li>
                    <li className="flex items-center gap-2"><span className="text-purple-400">🧠</span> Gemini 3 Pro Deep Reasoning Engine</li>
                    <li className="flex items-center gap-2"><span className="text-green-400">🎙️</span> Advanced Multi-lingual Voice Link</li>
                  </ul>
                  <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase font-bold">Monthly Uplink</div>
                      <div className="text-2xl font-black text-white">$9.99</div>
                    </div>
                    <button onClick={() => setPayStep('country')} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20">
                      Upgrade Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Country, Method, Details steps (simplified for brevity here as they match the existing infra) */}
            {payStep === 'country' && (
              <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4">
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Select Your Region</div>
                <div className="grid grid-cols-2 gap-3">
                  {[{ id: 'MY', label: 'Malaysia', icon: '🇲🇾' }, { id: 'ID', label: 'Indonesia', icon: '🇮🇩' }, { id: 'MM', label: 'Myanmar', icon: '🇲🇲' }, { id: 'GLOBAL', label: 'International', icon: '🌐' }].map(c => (
                    <button key={c.id} onClick={() => { setSelectedCountry(c.id as PaymentCountry); setPayStep('method'); }} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-blue-500 hover:bg-blue-500/10 transition-all flex items-center gap-3">
                      <span className="text-xl">{c.icon}</span>
                      <span className="text-[11px] font-bold text-white uppercase">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {payStep === 'method' && (
              <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4">
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Gateways</div>
                <div className="grid grid-cols-2 gap-3">
                  {getMethodsForCountry(selectedCountry).map(m => (
                    <button key={m.id} onClick={() => { setPayMethod(m.id as PaymentMethod); setPayStep('details'); }} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-blue-500 hover:bg-blue-500/10 transition-all flex items-center gap-3">
                      <span className="text-xl">{m.icon}</span>
                      <span className="text-[11px] font-bold text-white uppercase">{m.label}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setPayStep('country')} className="text-[10px] text-slate-500 uppercase font-black tracking-widest w-full text-center">Back</button>
              </div>
            )}

            {payStep === 'details' && (
              <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4">
                <div className="space-y-4">
                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Checkout with {payMethod.toUpperCase()}</div>
                  <input type="text" placeholder="Full Name" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs font-mono outline-none focus:border-blue-500" />
                  <input type="text" placeholder="Phone or Card Number" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs font-mono outline-none focus:border-blue-500" />
                </div>
                <button onClick={handleProcessPayment} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black rounded-2xl uppercase tracking-widest transition-all shadow-xl">
                  Confirm Upgrade
                </button>
                <button onClick={() => setPayStep('method')} className="text-[10px] text-slate-500 uppercase font-black tracking-widest w-full text-center">Back</button>
              </div>
            )}

            {payStep === 'processing' && (
              <div className="space-y-6 relative z-10 py-10">
                <div className="flex justify-center mb-8">
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="p-4 bg-black/60 border border-white/5 rounded-2xl font-mono text-[10px] text-blue-400/80 h-32 overflow-y-auto space-y-1">
                  {diagnosticLogs.map((log, i) => (
                    <div key={i} className="animate-in fade-in duration-300">{log}</div>
                  ))}
                </div>
              </div>
            )}

            {payStep === 'success' && (
              <div className="space-y-8 relative z-10 py-6 text-center animate-in zoom-in duration-500">
                <div className="text-4xl animate-bounce">💎</div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Neural Pro Online</h3>
                  <p className="text-[11px] text-slate-400">All advanced synthesis modules are now active.</p>
                </div>
                <button onClick={() => setShowPayModal(false)} className="w-full py-4 bg-white text-black text-[11px] font-black rounded-2xl uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl">
                   Go Premium
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VOICE SETTINGS MODAL - GATING APPLIED HERE */}
      {showVoiceSettings && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4">
          <div className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] max-w-lg w-full shadow-3xl space-y-8 animate-in zoom-in duration-300 relative">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-tighter gemini-gradient">Voice Link Neural Config</h2>
              <button onClick={() => setShowVoiceSettings(false)} className="text-slate-500 hover:text-white p-2">✕</button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Neural Voice Profile</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'] as VoiceName[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setVoiceSettings(s => ({ ...s, voice: v }))}
                      className={`px-3 py-3 rounded-2xl text-[10px] font-bold transition-all border ${
                        voiceSettings.voice === v ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Operation Protocol</label>
                  {userTier === 'free' && <span className="text-[8px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-black uppercase">Pro Only</span>}
                </div>
                <div className="flex flex-col gap-2">
                  {(['standard', 'translator', 'crisis_support'] as LiveConversationMode[]).map((m) => {
                    const isRestricted = m !== 'standard' && userTier === 'free';
                    return (
                      <button
                        key={m}
                        disabled={isRestricted}
                        onClick={() => setVoiceSettings(s => ({ ...s, mode: m }))}
                        className={`px-4 py-3 rounded-2xl text-[11px] font-bold transition-all border text-left flex items-center justify-between ${
                          isRestricted ? 'opacity-30 cursor-not-allowed bg-black/40 border-white/5' :
                          voiceSettings.mode === m ? 'bg-blue-600/20 border-blue-500/50 text-blue-100' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <span className="capitalize">{m.replace('_', ' ')}</span>
                        {isRestricted && <span className="text-[9px]">🔒</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={() => { setShowVoiceSettings(false); if (!isLiveMode) startLive(voiceSettings); }} className="w-full py-4 bg-white text-black text-sm font-black rounded-2xl uppercase tracking-widest shadow-xl">
                Initialize Link
              </button>
              {userTier === 'free' && (
                <button onClick={() => { setShowVoiceSettings(false); setPayStep('plan'); setShowPayModal(true); }} className="text-[10px] font-bold text-blue-400 hover:underline text-center">
                  Unlock Pro Features
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
