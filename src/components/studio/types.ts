export interface ModelData {
  name: string;
  age: number;
  gender: string;
  ethnicity: string;
  skin: string;
  hair: string;
  hairLength: string;
  eyes: string;
  face: string;
  body: string;
  style: string;
  height: number;
  buildLevel: number;
  personality: string;
  traits: { ei: number; sn: number; tf: number; jp: number };
  interests: string[];
  bio: string;
  location: string;
  occupation: string;
  // NEW: persona / reference-image fields
  referenceImageUrl?: string;   // public URL of the uploaded reference photo
  usePersonaPlate?: boolean;    // when true, AI uses the uploaded photo as identity plate
  // NEW: more-variety appearance fields
  wardrobe?: string;
  vibe?: string;
  freckles?: boolean;
  tattoos?: boolean;
  makeup?: string;
}

export const DEFAULT_MODEL: ModelData = {
  name: '',
  age: 25,
  gender: 'Female',
  ethnicity: 'Caucasian',
  skin: 'Light',
  hair: 'Brunette',
  hairLength: 'Long',
  eyes: 'Brown',
  face: 'Oval',
  body: 'Toned',
  style: 'Casual',
  height: 170,
  buildLevel: 55,
  personality: 'ENFP',
  traits: { ei: 70, sn: 50, tf: 60, jp: 60 },
  interests: [],
  bio: '',
  location: '',
  occupation: '',
  referenceImageUrl: '',
  usePersonaPlate: false,
  wardrobe: 'Jeans & tee',
  vibe: 'Warm & approachable',
  freckles: false,
  tattoos: false,
  makeup: 'Natural',
};
