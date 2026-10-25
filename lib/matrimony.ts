export type Match = {
  id: string;
  age: number;
  gender: string;
  city: string;
  profession: string;
  education: string;
  sect: string;
  language: string;
  marital: string;
  manager: string;
  about: string;
  values: string[];
  hasPhoto?: boolean;
  isDemo?: boolean;
};

export type Connection = {
  id: string;
  other: Match;
  direction: 'incoming' | 'outgoing';
  status: string;
  note: string;
  createdAt: string;
  details?: { name: string; email: string };
  photoShared?: boolean;
  myPhotoShared?: boolean;
};

export const valueOptions = ['Faith & spirituality', 'Family-oriented', 'Education', 'Kindness', 'Career', 'Community', 'Simple living'];
