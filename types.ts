
export type AnimationType = 'wave_hand' | 'nod_yes' | 'thinking' | 'point_at_screen' | 'idle' | 'warning';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  animation?: AnimationType;
  timestamp: Date;
  sources?: Array<{ title: string; uri: string }>;
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  currentAnimation: AnimationType;
}
