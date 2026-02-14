
export type AnimationType = 'wave_hand' | 'nod_yes' | 'thinking' | 'point_at_screen' | 'idle' | 'warning' | 'smile' | 'play_game';

export type ViewMode = 'standard' | 'ar' | 'vr';

export type UserTier = 'free' | 'premium';

export type PaymentCountry = 'MY' | 'ID' | 'MM' | 'GLOBAL';

export type PaymentMethod = 
  | 'stripe' 
  | 'paypal' 
  | 'crypto' 
  | 'tng' 
  | 'grabpay' 
  | 'fpx' 
  | 'gopay' 
  | 'ovo' 
  | 'dana' 
  | 'kbzpay' 
  | 'wavepay';

export type VoiceName = 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';

export type LiveConversationMode = 'standard' | 'translator' | 'crisis_support';

export interface VoiceLinkSettings {
  voice: VoiceName;
  mode: LiveConversationMode;
}

export interface Offer {
  id: string;
  title: string;
  discount: string;
  description: string;
}

export type ModelTier = 
  | 'gemini-3-flash-preview' // For Search Grounding (Premium)
  | 'gemini-3-pro-preview'   // For Thinking & Complex Tasks (Premium)
  | 'gemini-2.5-flash-lite'   // For Fast AI responses (Free)
  | 'gemini-2.5-flash'        // For Maps Grounding
  | 'gemini-2.5-flash-image'  // For Image Editing
  | 'gemini-3-pro-image-preview'; // For Image Gen

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'error' | 'success';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  animation?: AnimationType;
  timestamp: Date;
  sources?: Array<{ title: string; uri: string }>;
  modelUsed?: string;
  imageUrl?: string;
  videoUrl?: string;
  feedback?: 'positive' | 'negative';
  isThinking?: boolean;
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  currentAnimation: AnimationType;
  activeTier: ModelTier;
}
