export interface Tier {
  id: string;
  name: string;
  price: number; // in dollars
  priceLabel: string;
  interval: 'month' | 'one-time';
  tagline: string;
  generations: number;
  priceId: string;
  badge?: string;
  highlight?: boolean;
  features: string[];
  entitlements: {
    platforms: number; // -1 = all
    customization: 'basic' | 'full' | 'advanced';
    chatbot: 'none' | 'basic' | 'full' | 'advanced';
    inbox: boolean;
    conversationTracking: 'none' | 'basic' | 'full';
    banGuides: 'basic' | 'priority' | 'advanced';
    banAlerts: boolean;
    paymentSetup: boolean;
    whiteLabel: 'none' | 'partial' | 'full';
    analytics: boolean;
    teamSeats: number; // -1 = unlimited
    dedicatedManager: boolean;
    courseBundling: boolean;
    customDev: boolean;
    vipSupport: boolean;
    fullOwnership: boolean;
  };
}

export const TIERS: Tier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 20,
    priceLabel: '$20',
    interval: 'month',
    tagline: 'Launch your first AI model',
    generations: 100,
    priceId: 'price_1TOXJgQbUzV3pKdKG5PTkqR8',
    features: [
      '100 generations/month',
      'Basic model customization',
      'Unified inbox (2 platforms)',
      'Ban-prevention guides',
      'Email support',
    ],
    entitlements: {
      platforms: 2,
      customization: 'basic',
      chatbot: 'none',
      inbox: true,
      conversationTracking: 'none',
      banGuides: 'basic',
      banAlerts: false,
      paymentSetup: false,
      whiteLabel: 'none',
      analytics: false,
      teamSeats: 1,
      dedicatedManager: false,
      courseBundling: false,
      customDev: false,
      vipSupport: false,
      fullOwnership: false,
    },
  },
  {
    id: 'creator',
    name: 'Creator',
    price: 55,
    priceLabel: '$55',
    interval: 'month',
    tagline: 'Full toolkit for serious creators',
    generations: 700,
    priceId: 'price_1TOXJgQbUzV3pKdKmBVHAGCO',
    badge: 'MOST POPULAR',
    highlight: true,
    features: [
      '700 generations/month',
      'Full model customization',
      'Unified inbox (all platforms)',
      'Full AI chatbot',
      'Conversation tracking',
      'Analytics dashboard',
      'Priority ban-prevention guides + alerts',
      'Payment platform setup',
    ],
    entitlements: {
      platforms: -1,
      customization: 'full',
      chatbot: 'full',
      inbox: true,
      conversationTracking: 'full',
      banGuides: 'priority',
      banAlerts: true,
      paymentSetup: true,
      whiteLabel: 'none',
      analytics: true,
      teamSeats: 1,
      dedicatedManager: false,
      courseBundling: false,
      customDev: false,
      vipSupport: false,
      fullOwnership: false,
    },
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 209,
    priceLabel: '$209',
    interval: 'month',
    tagline: 'For teams & agencies',
    generations: 8000,
    priceId: 'price_1TOXJhQbUzV3pKdKok9eKzmO',
    features: [
      '8,000 generations/month',
      'Everything in Creator',
      'Multi-user team accounts (up to 5)',
      'White-label option',

      'Advanced analytics dashboard',
      'Dedicated account manager',
    ],
    entitlements: {
      platforms: -1,
      customization: 'advanced',
      chatbot: 'advanced',
      inbox: true,
      conversationTracking: 'full',
      banGuides: 'advanced',
      banAlerts: true,
      paymentSetup: true,
      whiteLabel: 'partial',
      analytics: true,
      teamSeats: 5,
      dedicatedManager: true,
      courseBundling: false,
      customDev: false,
      vipSupport: false,
      fullOwnership: false,
    },
  },
  {
    id: 'lifetime',
    name: 'Lifetime Ownership',
    price: 17500,
    priceLabel: '$17,500',
    interval: 'one-time',
    tagline: 'Own the entire app forever',
    generations: 999999,
    priceId: 'price_1TOXJhQbUzV3pKdKA6ZfXN2B',
    badge: 'OWNERSHIP',
    features: [
      'Full source code + rights',
      'No monthly fees ever',
      'Custom feature development',
      'VIP phone support',
    ],
    entitlements: {
      platforms: -1,
      customization: 'advanced',
      chatbot: 'advanced',
      inbox: true,
      conversationTracking: 'full',
      banGuides: 'advanced',
      banAlerts: true,
      paymentSetup: true,
      whiteLabel: 'full',
      analytics: true,
      teamSeats: -1,
      dedicatedManager: true,
      courseBundling: true,
      customDev: true,
      vipSupport: true,
      fullOwnership: true,
    },
  },
];

export const FREE_TIER: Tier = {
  id: 'free',
  name: 'Free',
  price: 0,
  priceLabel: 'Free',
  interval: 'month',
  tagline: 'Try before you buy',
  generations: 10,
  priceId: '',
  features: ['10 generations/month', 'Limited features'],
  entitlements: {
    platforms: 1,
    customization: 'basic',
    chatbot: 'none',
    inbox: false,
    conversationTracking: 'none',
    banGuides: 'basic',
    banAlerts: false,
    paymentSetup: false,
    whiteLabel: 'none',
    analytics: false,
    teamSeats: 1,
    dedicatedManager: false,
    courseBundling: false,
    customDev: false,
    vipSupport: false,
    fullOwnership: false,
  },
};

export const getTierById = (id: string): Tier => {
  return TIERS.find((t) => t.id === id) ?? FREE_TIER;
};
