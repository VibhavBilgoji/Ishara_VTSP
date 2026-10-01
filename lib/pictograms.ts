import type { PictogramItem } from './types'

export interface DetailedPictogram extends PictogramItem {
  description: string
  audioCue?: string
  hindiText?: string
}

// Design System Semantic Color Tokens with robust WCAG AAA light & dark mode hover/active states
const COLOR_EMERGENCY_RED =
  'bg-red-50 border-red-600 text-red-800 hover:bg-red-100/90 hover:border-red-600 hover:text-red-900 active:bg-red-200 dark:bg-red-950/40 dark:border-red-600/80 dark:text-red-200 dark:hover:bg-red-900/60 dark:hover:border-red-400 dark:hover:text-white dark:active:bg-red-950/90'

const COLOR_PAIN_AMBER =
  'bg-amber-50 border-amber-500 text-amber-800 hover:bg-amber-100/90 hover:border-amber-600 hover:text-amber-950 active:bg-amber-200 dark:bg-amber-950/40 dark:border-amber-600/80 dark:text-amber-200 dark:hover:bg-amber-900/60 dark:hover:border-amber-400 dark:hover:text-white dark:active:bg-amber-950/90'

const COLOR_ALLERGY_PURPLE =
  'bg-purple-50 border-purple-500 text-purple-800 hover:bg-purple-100/90 hover:border-purple-600 hover:text-purple-950 active:bg-purple-200 dark:bg-purple-950/40 dark:border-purple-600/80 dark:text-purple-200 dark:hover:bg-purple-900/60 dark:hover:border-purple-400 dark:hover:text-white dark:active:bg-purple-950/90'

const COLOR_BASIC_TEAL =
  'bg-teal-50 border-teal text-teal hover:bg-teal-100/90 hover:border-teal-light hover:text-[#00222a] active:bg-teal-200 dark:bg-teal-950/40 dark:border-teal-500/80 dark:text-teal-200 dark:hover:bg-teal-900/60 dark:hover:border-teal-400 dark:hover:text-white dark:active:bg-teal-950/90'

const COLOR_BASIC_BLUE =
  'bg-blue-50 border-blue-400 text-blue-800 hover:bg-blue-100/90 hover:border-blue-500 hover:text-blue-950 active:bg-blue-200 dark:bg-blue-950/40 dark:border-blue-500/80 dark:text-blue-200 dark:hover:bg-blue-900/60 dark:hover:border-blue-400 dark:hover:text-white dark:active:bg-blue-950/90'

const COLOR_BASIC_ORANGE =
  'bg-orange-50 border-orange-400 text-orange-800 hover:bg-orange-100/90 hover:border-orange-500 hover:text-orange-950 active:bg-orange-200 dark:bg-orange-950/40 dark:border-orange-500/80 dark:text-orange-200 dark:hover:bg-orange-900/60 dark:hover:border-orange-400 dark:hover:text-white dark:active:bg-orange-950/90'

const COLOR_BASIC_EMERALD =
  'bg-emerald-50 border-emerald-500 text-emerald-800 hover:bg-emerald-100/90 hover:border-emerald-600 hover:text-emerald-950 active:bg-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-500/80 dark:text-emerald-200 dark:hover:bg-emerald-900/60 dark:hover:border-emerald-400 dark:hover:text-white dark:active:bg-emerald-950/90'

export const EMERGENCY_P0_PICTOGRAMS: DetailedPictogram[] = [
  {
    key: 'chest-pain',
    label: 'Chest Pain',
    hindiText: 'सीने में दर्द',
    icon: 'HeartPulse',
    category: 'emergency',
    color: COLOR_EMERGENCY_RED,
    priority: 'P0',
    description: 'Acute chest tightness, pressure, or heart distress',
  },
  {
    key: 'cant-breathe',
    label: "Can't Breathe",
    hindiText: 'साँस लेने में तकलीफ़',
    icon: 'Lungs',
    category: 'emergency',
    color: COLOR_EMERGENCY_RED,
    priority: 'P0',
    description: 'Shortness of breath, choking, or respiratory failure',
  },
  {
    key: 'call-doctor-now',
    label: 'Call Doctor Now',
    hindiText: 'डॉक्टर को तुरंत बुलाएं',
    icon: 'DoctorAvatar',
    category: 'emergency',
    color: COLOR_EMERGENCY_RED,
    priority: 'P0',
    description: 'Urgent immediate clinical evaluation required',
  },
  {
    key: 'pain-level',
    label: 'Pain Scale (1-10)',
    hindiText: 'दर्द का स्तर (१-१०)',
    icon: 'Activity',
    category: 'pain',
    color: COLOR_PAIN_AMBER,
    priority: 'P0',
    description: 'Indicate severity of pain',
  },
  {
    key: 'i-have-allergy',
    label: 'Severe Allergy',
    hindiText: 'एलर्जी है',
    icon: 'ShieldAlert',
    category: 'allergy',
    color: COLOR_ALLERGY_PURPLE,
    priority: 'P0',
    description: 'Adverse allergic reaction or sensitivity',
  },
  {
    key: 'im-dizzy',
    label: "I'm Dizzy",
    hindiText: 'चक्कर आ रहे हैं',
    icon: 'DizzyAvatar',
    category: 'emergency',
    color: COLOR_PAIN_AMBER,
    priority: 'P0',
    description: 'Lightheadedness, spinning sensation, or loss of balance',
  },
  {
    key: 'water',
    label: 'Need Water',
    hindiText: 'पानी चाहिए',
    icon: 'GlassWater',
    category: 'basic',
    color: COLOR_BASIC_TEAL,
    priority: 'P1',
    description: 'Thirst or need for hydration assistance',
  },
  {
    key: 'toilet',
    label: 'Need Toilet',
    hindiText: 'शौचालय जाना है',
    icon: 'Toilet',
    category: 'basic',
    color: COLOR_BASIC_TEAL,
    priority: 'P1',
    description: 'Assistance to washroom or bedpan',
  },
  {
    key: 'feel-very-sick',
    label: 'Nausea / Sick',
    hindiText: 'उल्टी या जी घबराना',
    icon: 'Nauseous',
    category: 'emergency',
    color: COLOR_PAIN_AMBER,
    priority: 'P0',
    description: 'Feeling ill, upset stomach, or about to vomit',
  },
]

export const ALL_CATEGORY_PICTOGRAMS: Record<string, DetailedPictogram[]> = {
  Emergency: EMERGENCY_P0_PICTOGRAMS,
  'Basic Needs': [
    {
      key: 'water',
      label: 'Water',
      hindiText: 'पानी',
      icon: 'GlassWater',
      category: 'basic',
      color: COLOR_BASIC_TEAL,
      priority: 'P1',
      description: 'Need water to drink',
    },
    {
      key: 'toilet',
      label: 'Toilet',
      hindiText: 'शौचालय',
      icon: 'Toilet',
      category: 'basic',
      color: COLOR_BASIC_TEAL,
      priority: 'P1',
      description: 'Need restroom assistance',
    },
    {
      key: 'blanket',
      label: 'Blanket / Cold',
      hindiText: 'कंबल / ठंड',
      icon: 'Snowflake',
      category: 'basic',
      color: COLOR_BASIC_BLUE,
      priority: 'P1',
      description: 'Feeling cold, need blanket',
    },
    {
      key: 'hot',
      label: 'Feeling Hot',
      hindiText: 'गर्मी लग रही है',
      icon: 'ThermometerSun',
      category: 'basic',
      color: COLOR_BASIC_ORANGE,
      priority: 'P1',
      description: 'Overheated or sweating',
    },
    {
      key: 'hungry',
      label: 'Hungry',
      hindiText: 'भूख लगी है',
      icon: 'UtensilsCrossed',
      category: 'basic',
      color: COLOR_BASIC_EMERALD,
      priority: 'P1',
      description: 'Need meal or dietary support',
    },
    {
      key: 'vomit',
      label: 'Vomiting',
      hindiText: 'उल्टी हो रही है',
      icon: 'Nauseous',
      category: 'basic',
      color: COLOR_EMERGENCY_RED,
      priority: 'P1',
      description: 'Emesis or basin needed',
    },
  ],
  Pain: [
    {
      key: 'head-hurts',
      label: 'Head Pain',
      hindiText: 'सिर दर्द',
      icon: 'Brain',
      category: 'pain',
      color: COLOR_PAIN_AMBER,
      priority: 'P0',
      description: 'Headache or migraine',
    },
    {
      key: 'stomach-hurts',
      label: 'Stomach Pain',
      hindiText: 'पेट दर्द',
      icon: 'StomachPain',
      category: 'pain',
      color: COLOR_PAIN_AMBER,
      priority: 'P0',
      description: 'Abdominal pain',
    },
    {
      key: 'chest-hurts',
      label: 'Chest Ache',
      hindiText: 'छाती में दर्द',
      icon: 'HeartPulse',
      category: 'pain',
      color: COLOR_EMERGENCY_RED,
      priority: 'P0',
      description: 'Chest wall pain or ache',
    },
    {
      key: 'back-hurts',
      label: 'Back Pain',
      hindiText: 'पीठ दर्द',
      icon: 'BackPain',
      category: 'pain',
      color: COLOR_PAIN_AMBER,
      priority: 'P0',
      description: 'Spinal or muscular back pain',
    },
    {
      key: 'pain-started-now',
      label: 'Pain Started Just Now',
      hindiText: 'दर्द अभी शुरू हुआ',
      icon: 'Clock',
      category: 'pain',
      color: COLOR_EMERGENCY_RED,
      priority: 'P0',
      description: 'Sudden acute onset of pain',
    },
  ],
  Allergies: [
    {
      key: 'allergic-penicillin',
      label: 'Penicillin Allergy',
      hindiText: 'पेनिसिलिन एलर्जी',
      icon: 'Pill',
      category: 'allergy',
      color: COLOR_ALLERGY_PURPLE,
      priority: 'P0',
      description: 'Cannot tolerate penicillin medications',
    },
    {
      key: 'allergic-aspirin',
      label: 'Aspirin Allergy',
      hindiText: 'एस्पिरिन एलर्जी',
      icon: 'Pill',
      category: 'allergy',
      color: COLOR_ALLERGY_PURPLE,
      priority: 'P0',
      description: 'Cannot take NSAIDs or aspirin',
    },
    {
      key: 'allergic-latex',
      label: 'Latex Allergy',
      hindiText: 'लेटेक्स एलर्जी',
      icon: 'LatexAllergy',
      category: 'allergy',
      color: COLOR_ALLERGY_PURPLE,
      priority: 'P0',
      description: 'Use non-latex gloves and medical gear',
    },
    {
      key: 'no-known-allergy',
      label: 'No Known Allergies',
      hindiText: 'कोई एलर्जी नहीं',
      icon: 'CheckCircle',
      category: 'allergy',
      color: COLOR_BASIC_EMERALD,
      priority: 'P2',
      description: 'No known drug allergies reported',
    },
  ],
}
