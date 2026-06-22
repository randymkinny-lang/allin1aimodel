import { DEFAULT_MODEL, type ModelData } from '@/components/studio/types';
import { MBTI_TYPES } from '@/data/models';

const APPEARANCE = {
  hair: ['Brunette', 'Blonde', 'Black', 'Red', 'Auburn', 'Dark Brown', 'Platinum', 'Strawberry Blonde', 'Honey', 'Chestnut', 'Jet Black', 'Silver'],
  eyes: ['Brown', 'Hazel', 'Green', 'Blue', 'Gray', 'Amber', 'Violet', 'Deep Brown'],
  skin: ['Porcelain', 'Fair', 'Light', 'Medium', 'Olive', 'Tan', 'Bronze', 'Deep', 'Ebony'],
  body: ['Petite', 'Slim', 'Slender', 'Athletic', 'Toned', 'Curvy', 'Average', 'Hourglass', 'Muscular'],
  face: ['Heart-shaped', 'Oval', 'Round', 'Square', 'Diamond', 'Long', 'Triangle'],
  style: ['Casual', 'Elegant', 'Sporty', 'Bohemian', 'Classic', 'Edgy', 'Preppy', 'Streetwear', 'Vintage', 'Minimalist', 'Gothic', 'Cottagecore'],
  ethnicity: ['Caucasian', 'Latina', 'Asian', 'East Asian', 'South Asian', 'African', 'African-American', 'Middle Eastern', 'Pacific Islander', 'Native American', 'Mixed'],
  hairLength: ['Pixie', 'Short', 'Bob', 'Shoulder-length', 'Long', 'Very Long', 'Waist-length'],
  wardrobe: ['Jeans & tee', 'Sundress', 'Athleisure', 'Business casual', 'Cozy sweater', 'Little black dress', 'Boho maxi', 'Leather jacket', 'Oversized hoodie', 'Blazer & jeans', 'Crop top & skirt', 'Evening gown'],
  vibe: ['Warm & approachable', 'Mysterious & sultry', 'Bubbly & playful', 'Confident & powerful', 'Soft & dreamy', 'Edgy & rebellious', 'Sophisticated & poised', 'Natural & earthy'],
  makeup: ['None', 'Natural', 'No-makeup makeup', 'Soft glam', 'Full glam', 'Smokey eye', 'Bold red lip', 'Dewy', 'Matte'],
};

const FIRST_NAMES_F = ['Ava', 'Sofia', 'Emma', 'Lily', 'Mia', 'Zoe', 'Chloe', 'Luna', 'Maya', 'Ivy', 'Nora', 'Sienna', 'Aria', 'Isla', 'Jade', 'Ruby', 'Hazel', 'Violet', 'Scarlett', 'Willow', 'Aurora', 'Camila', 'Valentina', 'Anya', 'Naomi', 'Amara', 'Priya', 'Yuki', 'Freya', 'Elena'];
const FIRST_NAMES_M = ['Jordan', 'Marcus', 'Ethan', 'Liam', 'Noah', 'Leo', 'Kai', 'Asher', 'Theo', 'Jude', 'Miles', 'Silas', 'Hunter', 'Arlo', 'Finn', 'Diego', 'Mateo', 'Ryder', 'Blake', 'Xavier', 'Dante'];
const FIRST_NAMES_NB = ['Rowan', 'Sage', 'River', 'Phoenix', 'Avery', 'Quinn', 'Blake', 'Remy', 'Ellis', 'Wren', 'Ari'];
const LAST_NAMES = ['Morgan', 'Reyes', 'Blake', 'Carter', 'Chen', 'Hayes', 'Vale', 'Kim', 'Nguyen', 'Rossi', 'Hart', 'Moreno', 'Stone', 'Fox', 'Lane', 'Ford', 'Bennett', 'Price', 'Sloan', 'Rivera', 'Park', 'Ivanov', 'Khan', 'Okafor', 'Sato', 'Walsh', 'Diaz', 'Wolfe', 'Bishop', 'Lux'];

const OCCUPATIONS = ['Yoga instructor', 'Travel blogger', 'Fitness coach', 'Fashion stylist', 'Photographer', 'DJ', 'Surfer', 'Bartender', 'Ballet dancer', 'Graphic designer', 'Chef', 'Sommelier', 'Painter', 'Music producer', 'Model', 'Marine biologist', 'Pilates teacher', 'Novelist', 'Barista & poet', 'Indie musician', 'Makeup artist', 'Florist', 'Tattoo artist', 'Jewelry designer', 'Surf instructor', 'Film student', 'Architect', 'Personal trainer'];
const LOCATIONS = ['Los Angeles, CA', 'Miami, FL', 'New York, NY', 'Austin, TX', 'Brooklyn, NY', 'Nashville, TN', 'San Diego, CA', 'Tulum, MX', 'Lisbon, PT', 'Bali, ID', 'Tokyo, JP', 'Seoul, KR', 'Paris, FR', 'London, UK', 'Berlin, DE', 'Barcelona, ES', 'Sydney, AU', 'Cape Town, ZA', 'Rio de Janeiro, BR', 'Reykjavik, IS', 'Dubai, UAE', 'Toronto, CA', 'Mumbai, IN', 'Amsterdam, NL'];

const INTERESTS = ['Yoga', 'Travel', 'Photography', 'Cooking', 'Fitness', 'Reading', 'Music', 'Art', 'Dancing', 'Hiking', 'Coffee', 'Wine', 'Gaming', 'Fashion', 'Movies', 'Pets', 'Beach', 'Cars', 'Meditation', 'Writing', 'Skiing', 'Surfing', 'Tech', 'Podcasts'];

const BIO_SNIPPETS = [
  'Chasing golden-hour light and slow Sunday mornings.',
  'Equal parts wanderer and homebody. Coffee first, always.',
  'Soft heart, loud laugh, terrible at math.',
  'Turning ordinary days into little love letters.',
  'Lives on playlists, iced lattes and spontaneous road trips.',
  'Collecting sunsets, stamps in my passport, and good friends.',
  'Plant mom, book nerd, dancer in the kitchen.',
  'Warm smiles, cold brews, warmer conversations.',
  'Soft girl summer, year-round.',
  'Happiest barefoot, near water, with a good story in hand.',
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const chance = (p: number) => Math.random() < p;
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export function randomModelData(): ModelData {
  const gender = pick(['Female', 'Female', 'Female', 'Male', 'Non-binary']); // weighted
  const firstPool = gender === 'Female' ? FIRST_NAMES_F : gender === 'Male' ? FIRST_NAMES_M : FIRST_NAMES_NB;
  const name = `${pick(firstPool)} ${pick(LAST_NAMES)}`;
  const age = randInt(19, 35);
  const occupation = pick(OCCUPATIONS);
  const location = pick(LOCATIONS);
  const personality = pick(MBTI_TYPES).code;

  // 3-5 random interests
  const interestCount = randInt(3, 5);
  const shuffled = [...INTERESTS].sort(() => Math.random() - 0.5);
  const interests = shuffled.slice(0, interestCount);

  const bio = `${pick(BIO_SNIPPETS)} ${age}, based in ${location}. ${occupation} by day, ${pick(['dreamer', 'daydreamer', 'storyteller', 'adventurer', 'night owl'])} by night.`;

  return {
    ...DEFAULT_MODEL,
    name,
    age,
    gender,
    ethnicity: pick(APPEARANCE.ethnicity),
    skin: pick(APPEARANCE.skin),
    hair: pick(APPEARANCE.hair),
    hairLength: pick(APPEARANCE.hairLength),
    eyes: pick(APPEARANCE.eyes),
    face: pick(APPEARANCE.face),
    body: pick(APPEARANCE.body),
    style: pick(APPEARANCE.style),
    height: randInt(155, 190),
    buildLevel: randInt(30, 85),
    personality,
    traits: {
      ei: randInt(10, 90),
      sn: randInt(10, 90),
      tf: randInt(10, 90),
      jp: randInt(10, 90),
    },
    interests,
    bio,
    location,
    occupation,
    referenceImageUrl: '',
    usePersonaPlate: false,
    wardrobe: pick(APPEARANCE.wardrobe),
    vibe: pick(APPEARANCE.vibe),
    freckles: chance(0.25),
    tattoos: chance(0.2),
    makeup: pick(APPEARANCE.makeup),
  };
}
