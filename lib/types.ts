export type Mood = 'great' | 'good' | 'neutral' | 'bad' | 'terrible';

export interface Entry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: Mood;
  createdAt: string;
  updatedAt: string;
}

export interface FreudMessage {
  id: string;
  role: 'user' | 'freud';
  content: string;
  createdAt: string;
}

export interface FreudSession {
  id: string;
  entryId: string;
  date: string;
  messages: FreudMessage[];
  createdAt: string;
  updatedAt: string;
}
