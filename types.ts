export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  image?: string; // Base64 data URI
  originalImage?: string; // For comparison with visualizations
  isVisualization?: boolean;
  isGuide?: boolean; // For placement guides/ghost images
  timestamp: number;
}

export enum AppMode {
  DECLUTTER = 'declutter',
  LIVE = 'live'
}

export interface ProcessingState {
  isAnalyzing: boolean;
  isVisualizing: boolean;
  isThinking: boolean;
}