/**
 * Marketing Yatra · Google Gemini Video Ads prompt pack (2026 Edition).
 * 60 slash commands across 6 categories — inspired by marketingyatra.com pack.
 * Use in Creative Studio: attach product photo + product name + optional styling.
 */

export type MarketingYatraCategoryId =
  | 'creator_ugc'
  | 'studio_premium'
  | 'brand_story'
  | 'lifestyle'
  | 'feature_demo'
  | 'sale_launch';

export type MarketingYatraPrompt = {
  id: string;
  command: string;
  category: MarketingYatraCategoryId;
  label: string;
  description: string;
  /** Full Gemini scene prompt (product name substituted at runtime). */
  scenePrompt: string;
  suggestedFormat: 'SHORT_FORM_15S' | 'SHORT_FORM_30S' | 'SHORT_FORM_60S' | 'LONG_FORM_2M';
  suggestedAspectRatio: '9:16' | '1:1' | '16:9';
  /** When approved to storefront, prefer hero media type. */
  heroMediaType: 'video' | 'image';
};

export type MarketingYatraCategory = {
  id: MarketingYatraCategoryId;
  label: string;
  subtitle: string;
  promptCount: number;
};

export const MARKETING_YATRA_CATEGORIES: MarketingYatraCategory[] = [
  {
    id: 'creator_ugc',
    label: 'Creator-Style & UGC',
    subtitle: 'Hand-held, phone-filmed ads with honest captions',
    promptCount: 10,
  },
  {
    id: 'studio_premium',
    label: 'Studio & Premium Shoot',
    subtitle: 'Controlled light, polished product motion',
    promptCount: 10,
  },
  {
    id: 'brand_story',
    label: 'Brand Story & Journey',
    subtitle: 'Problem → making → product in customer hands',
    promptCount: 10,
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle & In-Context',
    subtitle: 'Product living in real scenes buyers relate to',
    promptCount: 10,
  },
  {
    id: 'feature_demo',
    label: 'Feature & Demo',
    subtitle: 'Function, proof, and satisfying payoff shots',
    promptCount: 10,
  },
  {
    id: 'sale_launch',
    label: 'Sale & Launch',
    subtitle: 'Drops, bundles, urgency, and occasion edits',
    promptCount: 10,
  },
];

export const MARKETING_YATRA_PROMPTS: MarketingYatraPrompt[] = [
  // Category 01 — Creator-Style & UGC
  {
    id: 'unbox-now',
    command: '/unbox-now',
    category: 'creator_ugc',
    label: 'Unbox Now',
    description: 'First-person hands tearing open your package on a bed, natural light, slow reveal.',
    scenePrompt:
      'First-person POV hands tearing open a package on a bed in natural morning light. Slow, satisfying reveal of {productName}. Hand-held phone aesthetic, authentic UGC, soft shadows, no studio polish.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'talk-to-camera',
    command: '/talk-to-camera',
    category: 'creator_ugc',
    label: 'Talk to Camera',
    description: 'Raw 15-second creator take straight to camera.',
    scenePrompt:
      'A creator gives a raw 15-second honest take on {productName} straight to camera. Hand-held selfie framing, natural room light, conversational tone, subtle background blur.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'morning-add-in',
    command: '/morning-add-in',
    category: 'creator_ugc',
    label: 'Morning Add-In',
    description: 'Product folded into a real morning routine while narrating.',
    scenePrompt:
      'Someone naturally integrates {productName} into their real morning routine while narrating. Kitchen or bathroom setting, warm light, casual voice-over, product used twice in sequence.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'first-try',
    command: '/first-try',
    category: 'creator_ugc',
    label: 'First Try',
    description: 'Genuine first-time reaction with unscripted surprise.',
    scenePrompt:
      'Genuine first-time reaction to trying {productName}. Unscripted surprise, close-up on face then product, hand-held phone capture, authentic emotion.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'viral-rant',
    command: '/viral-rant',
    category: 'creator_ugc',
    label: 'Viral Rant',
    description: 'Fast-cut creator hype with bold on-screen captions.',
    scenePrompt:
      'Fast-cut creator hyping {productName} with bold kinetic on-screen captions. Jump cuts every 1–2 seconds, energetic pacing, trending social ad style.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'change-my-mind',
    command: '/change-my-mind',
    category: 'creator_ugc',
    label: 'Change My Mind',
    description: 'Skeptical buyer becomes a genuine fan mid-video.',
    scenePrompt:
      'Opens skeptical about {productName}, mid-video attitude shift to genuine fan after trying it. Split tone, relatable script, satisfied close-up.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'three-times-a-day',
    command: '/three-times-a-day',
    category: 'creator_ugc',
    label: 'Three Times a Day',
    description: 'Product appears naturally three times across a realistic day.',
    scenePrompt:
      '{productName} appears naturally three times across one realistic day — morning, afternoon, evening. Documentary-style cuts, lifestyle montage, subtle product placement.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'reply-to-comment',
    command: '/reply-to-comment',
    category: 'creator_ugc',
    label: 'Reply to Comment',
    description: 'Creator answers a fake on-screen comment by demoing the product.',
    scenePrompt:
      'Creator replies to a fake on-screen comment by demoing {productName}. Comment bubble overlay, direct response, quick product close-ups.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'honest-take',
    command: '/honest-take',
    category: 'creator_ugc',
    label: 'Honest Take',
    description: 'Balanced review naming one small flaw before rebuy recommendation.',
    scenePrompt:
      'Balanced honest review of {productName}: names one small flaw, then explains why they would rebuy. Trustworthy tone, mid-shot creator, product in hand.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'expectation-vs-reality',
    command: '/expectation-vs-reality',
    category: 'creator_ugc',
    label: 'Expectation vs Reality',
    description: 'Split reaction — product beats low expectations.',
    scenePrompt:
      'Split-screen expectation vs reality for {productName}. Low expectation setup, then satisfying reveal that exceeds it. Punchy transition, happy close.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },

  // Category 02 — Studio & Premium
  {
    id: 'clean-set',
    command: '/clean-set',
    category: 'studio_premium',
    label: 'Clean Set',
    description: 'Seamless studio backdrop, slow orbit, soft key light.',
    scenePrompt:
      '{productName} on seamless studio backdrop. Slow orbiting camera, soft key light, premium commercial look, minimal props.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'float-and-spin',
    command: '/float-and-spin',
    category: 'studio_premium',
    label: 'Float and Spin',
    description: 'Product hovers and slowly rotates against a solid colour field.',
    scenePrompt:
      '{productName} hovers and slowly rotates against a solid colour field. Clean CGI-style product hero, smooth 360 motion.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '1:1',
    heroMediaType: 'video',
  },
  {
    id: 'light-sweep-reveal',
    command: '/light-sweep-reveal',
    category: 'studio_premium',
    label: 'Light Sweep Reveal',
    description: 'Dark set, single spotlight sweeps in to reveal product.',
    scenePrompt:
      'Dark studio set. A single spotlight sweeps across to reveal {productName}. Dramatic cinematic reveal, high contrast.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '16:9',
    heroMediaType: 'video',
  },
  {
    id: 'splash-freeze',
    command: '/splash-freeze',
    category: 'studio_premium',
    label: 'Splash Freeze',
    description: 'Product frozen mid-splash of water droplets.',
    scenePrompt:
      '{productName} frozen mid-splash of water droplets. Crisp high-shutter detail, macro splash particles, premium beverage/beauty aesthetic.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'marble-push-in',
    command: '/marble-push-in',
    category: 'studio_premium',
    label: 'Marble Push-In',
    description: 'Product on polished marble with shallow depth-of-field push-in.',
    scenePrompt:
      '{productName} staged on polished marble surface. Slow shallow depth-of-field push-in, luxury retail tone.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'image',
  },
  {
    id: 'gradient-glide',
    command: '/gradient-glide',
    category: 'studio_premium',
    label: 'Gradient Glide',
    description: 'Two-tone gradient backdrop with gentle parallax drift.',
    scenePrompt:
      'Smooth two-tone gradient backdrop. {productName} centred with gentle parallax drift. Modern DTC ad motion.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'macro-glide',
    command: '/macro-glide',
    category: 'studio_premium',
    label: 'Macro Glide',
    description: 'Extreme close-up gliding across texture and finish.',
    scenePrompt:
      'Extreme macro close-up gliding slowly across the texture and finish of {productName}. ASMR-quality detail, soft rim light.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'pedestal-loop',
    command: '/pedestal-loop',
    category: 'studio_premium',
    label: 'Pedestal Loop',
    description: '360° rotating pedestal loop with rim lighting.',
    scenePrompt:
      '{productName} on a rotating pedestal. Seamless 360° loop with rim lighting, e-commerce hero loop.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '1:1',
    heroMediaType: 'video',
  },
  {
    id: 'silk-drift',
    command: '/silk-drift',
    category: 'studio_premium',
    label: 'Silk Drift',
    description: 'Flowing silk fabric behind product in slow motion.',
    scenePrompt:
      'Flowing silk fabric drifting in slow motion behind {productName}. Elegant fashion/beauty tone, soft studio lighting.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'neon-edge-light',
    command: '/neon-edge-light',
    category: 'studio_premium',
    label: 'Neon Edge Light',
    description: 'Single neon accent against matte black, moody tone.',
    scenePrompt:
      '{productName} lit with a single neon accent edge light against matte black. Moody tech/lifestyle tone.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },

  // Category 03 — Brand Story
  {
    id: 'origin-to-hand',
    command: '/origin-to-hand',
    category: 'brand_story',
    label: 'Origin to Hand',
    description: 'Arc from raw material to finished product to happy customer.',
    scenePrompt:
      'Full arc for {productName}: raw material → finished product → happy customer using it. Warm narrative montage, 30 seconds.',
    suggestedFormat: 'SHORT_FORM_60S',
    suggestedAspectRatio: '16:9',
    heroMediaType: 'video',
  },
  {
    id: 'source-to-shelf',
    command: '/source-to-shelf',
    category: 'brand_story',
    label: 'Source to Shelf',
    description: 'Sourcing origin through processing to packaged product on shelf.',
    scenePrompt:
      'Sourcing origin of {productName}, through processing, to packaged product on retail shelf. Documentary brand film style.',
    suggestedFormat: 'SHORT_FORM_60S',
    suggestedAspectRatio: '16:9',
    heroMediaType: 'video',
  },
  {
    id: 'ache-to-answer',
    command: '/ache-to-answer',
    category: 'brand_story',
    label: 'Ache to Answer',
    description: 'Opens on frustration your product solves, resolves in use.',
    scenePrompt:
      'Opens on the frustration {productName} solves, resolves with product in active use. Emotional before/after story beat.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'making-of',
    command: '/making-of',
    category: 'brand_story',
    label: 'Making Of',
    description: 'Behind-the-scenes montage of product being crafted.',
    scenePrompt:
      'Behind-the-scenes montage of {productName} being crafted step by step. Workshop/detail shots, authentic maker energy.',
    suggestedFormat: 'SHORT_FORM_60S',
    suggestedAspectRatio: '16:9',
    heroMediaType: 'video',
  },
  {
    id: 'sketch-to-real',
    command: '/sketch-to-real',
    category: 'brand_story',
    label: 'Sketch to Real',
    description: 'Concept sketch dissolves into the finished product.',
    scenePrompt:
      'Concept sketch of {productName} dissolves into the real finished product. Design-to-reality transition, clean motion graphics.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'a-day-with-it',
    command: '/a-day-with-it',
    category: 'brand_story',
    label: 'A Day With It',
    description: 'Product followed from morning to night.',
    scenePrompt:
      'Follow {productName} across a single day from morning to night. Lifestyle documentary cuts, natural light progression.',
    suggestedFormat: 'SHORT_FORM_60S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'the-shift',
    command: '/the-shift',
    category: 'brand_story',
    label: 'The Shift',
    description: 'Before-state, product applied, satisfying after-state.',
    scenePrompt:
      'Clear before-state, {productName} applied or used, then satisfying after-state. Transformation ad structure.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'why-we-built-it',
    command: '/why-we-built-it',
    category: 'brand_story',
    label: 'Why We Built It',
    description: 'Founder-style narration on why the product exists.',
    scenePrompt:
      'Short founder-style narration on why {productName} exists, ending on product in use. Authentic voice-over, b-roll product shots.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '16:9',
    heroMediaType: 'video',
  },
  {
    id: 'parts-of-it',
    command: '/parts-of-it',
    category: 'brand_story',
    label: 'Parts of It',
    description: 'Each key component introduced, then combined.',
    scenePrompt:
      'Each key component of {productName} introduced individually, then combined into the finished product. Exploded-view style montage.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '16:9',
    heroMediaType: 'video',
  },
  {
    id: 'door-to-door',
    command: '/door-to-door',
    category: 'brand_story',
    label: 'Door to Door',
    description: 'Tap to buy through pack, ship, deliver, unbox.',
    scenePrompt:
      'Customer taps to buy {productName}, packed, shipped, delivered, unboxed — full e-commerce loop. Fast upbeat montage.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },

  // Category 04 — Lifestyle
  {
    id: 'kitchen-morning',
    command: '/kitchen-morning',
    category: 'lifestyle',
    label: 'Kitchen Morning',
    description: 'Sunlit kitchen counter during relaxed breakfast.',
    scenePrompt:
      '{productName} on a sunlit kitchen counter during a relaxed breakfast scene. Warm natural light, lived-in home.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'image',
  },
  {
    id: 'home-desk',
    command: '/home-desk',
    category: 'lifestyle',
    label: 'Home Desk',
    description: 'Clean productive work-from-home desk styling.',
    scenePrompt:
      '{productName} styled into a clean, productive work-from-home desk setup. Minimal clutter, soft daylight.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '16:9',
    heroMediaType: 'image',
  },
  {
    id: 'gym-pull',
    command: '/gym-pull',
    category: 'lifestyle',
    label: 'Gym Pull',
    description: 'Product pulled from gym bag mid-workout.',
    scenePrompt:
      '{productName} pulled from a gym bag and used mid-workout routine. Active energy, dynamic camera.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'on-the-move',
    command: '/on-the-move',
    category: 'lifestyle',
    label: 'On the Move',
    description: 'Airport, hotel, travel — product on the go.',
    scenePrompt:
      '{productName} packed and used on the move — airport, hotel, commuter scenes. Travel lifestyle montage.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'wind-down',
    command: '/wind-down',
    category: 'lifestyle',
    label: 'Wind Down',
    description: 'Warm low-light evening calm moment.',
    scenePrompt:
      'Warm low-light evening scene with {productName} in a calm wind-down moment. Cozy ambient mood.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'park-bright',
    command: '/park-bright',
    category: 'lifestyle',
    label: 'Park Bright',
    description: 'Bright outdoor picnic or park setting.',
    scenePrompt:
      '{productName} featured in a bright outdoor picnic or park setting. Vibrant daylight, fresh tone.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'image',
  },
  {
    id: 'getting-ready',
    command: '/getting-ready',
    category: 'lifestyle',
    label: 'Getting Ready',
    description: 'Prepping for a night out, glamorous mood.',
    scenePrompt:
      '{productName} used while getting ready for a night out. Glamorous mood, mirror shots, soft gold light.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'around-the-table',
    command: '/around-the-table',
    category: 'lifestyle',
    label: 'Around the Table',
    description: 'Product shared around a lively family table.',
    scenePrompt:
      '{productName} shared around a lively family table scene. Warm communal energy, multiple hands reaching.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '16:9',
    heroMediaType: 'video',
  },
  {
    id: 'slow-sunday',
    command: '/slow-sunday',
    category: 'lifestyle',
    label: 'Slow Sunday',
    description: 'Slow indulgent self-care sequence.',
    scenePrompt:
      'Slow, indulgent self-care Sunday sequence built around {productName}. Relaxed pacing, soft music bed implied.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'cafe-corner',
    command: '/cafe-corner',
    category: 'lifestyle',
    label: 'Café Corner',
    description: 'Product on café table with ambient background life.',
    scenePrompt:
      '{productName} placed on a café table with ambient background life — steam, chatter, passing people blur.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'image',
  },

  // Category 05 — Feature & Demo
  {
    id: 'show-the-function',
    command: '/show-the-function',
    category: 'feature_demo',
    label: 'Show the Function',
    description: 'Straightforward demo of core function and result.',
    scenePrompt:
      'Straightforward demonstration of {productName} core function and visible result. Clear hands-on demo, neutral background.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'wipe-transition',
    command: '/wipe-transition',
    category: 'feature_demo',
    label: 'Wipe Transition',
    description: 'Clean wipe from before to product-driven after.',
    scenePrompt:
      'Clean wipe transition from before-state to after-state driven by {productName}. Satisfying visual change.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'three-step-how',
    command: '/three-step-how',
    category: 'feature_demo',
    label: 'Three-Step How',
    description: 'Simple three-step how-to with numbered captions.',
    scenePrompt:
      'Simple three-step how-to for {productName} with numbered on-screen captions. Clear instructional pacing.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'best-moment',
    command: '/best-moment',
    category: 'feature_demo',
    label: 'Best Moment',
    description: 'Focus on the single most satisfying moment.',
    scenePrompt:
      'Focus entirely on the single most satisfying moment {productName} produces. Slow-motion payoff, tight framing.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'label-callouts',
    command: '/label-callouts',
    category: 'feature_demo',
    label: 'Label Callouts',
    description: 'Camera glides with animated labels on each feature.',
    scenePrompt:
      'Camera glides across {productName} with animated labels calling out each key feature. Clean motion graphics overlay.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '16:9',
    heroMediaType: 'video',
  },
  {
    id: 'against-the-clock',
    command: '/against-the-clock',
    category: 'feature_demo',
    label: 'Against the Clock',
    description: 'Product delivers result fast with on-screen timer.',
    scenePrompt:
      '{productName} delivers its result fast with an on-screen countdown timer. Urgent demo energy, clear payoff.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'stress-test',
    command: '/stress-test',
    category: 'feature_demo',
    label: 'Stress Test',
    description: 'Product under visible stress to prove durability.',
    scenePrompt:
      '{productName} put under visible stress on camera to prove it holds up. Dramatic proof shot, confident tone.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'old-way-new-way',
    command: '/old-way-new-way',
    category: 'feature_demo',
    label: 'Old Way vs New Way',
    description: 'Side-by-side old method vs your product.',
    scenePrompt:
      '{productName} beside the old method, side-by-side comparison, product clearly winning. Split screen demo.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '16:9',
    heroMediaType: 'video',
  },
  {
    id: 'one-swipe-payoff',
    command: '/one-swipe-payoff',
    category: 'feature_demo',
    label: 'One Swipe Payoff',
    description: 'Single use showing immediate visible payoff.',
    scenePrompt:
      'Single application or use of {productName} showing an immediate, visible payoff. Tight macro on result.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'macro-proof',
    command: '/macro-proof',
    category: 'feature_demo',
    label: 'Macro Proof',
    description: 'Macro proof of the exact result buyers doubt.',
    scenePrompt:
      'Macro proof shot of the exact result {productName} delivers — the detail buyers are skeptical about.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },

  // Category 06 — Sale & Launch
  {
    id: 'deal-drop',
    command: '/deal-drop',
    category: 'sale_launch',
    label: 'Deal Drop',
    description: 'Bold fast-cut ad around a clear discount or bundle.',
    scenePrompt:
      'Bold fast-cut ad for {productName} built around a single clear discount or bundle offer. Kinetic typography, hard CTA.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'new-arrival',
    command: '/new-arrival',
    category: 'sale_launch',
    label: 'New Arrival',
    description: 'Hype launch teaser with kinetic type.',
    scenePrompt:
      'Hype-style launch teaser revealing {productName} as a new arrival. Kinetic typography, build-up energy.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'bundle-build',
    command: '/bundle-build',
    category: 'sale_launch',
    label: 'Bundle Build',
    description: 'Three products animate together into one bundle.',
    scenePrompt:
      'Three related items animate together with {productName} into one value bundle. Stacked product hero, price callout.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '1:1',
    heroMediaType: 'video',
  },
  {
    id: 'festival-edit',
    command: '/festival-edit',
    category: 'sale_launch',
    label: 'Festival Edit',
    description: 'Occasion-themed ad for festival or celebration.',
    scenePrompt:
      'Occasion-themed festival edit featuring {productName}. Cultural celebration styling, festive colours, gift energy.',
    suggestedFormat: 'SHORT_FORM_30S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'almost-gone',
    command: '/almost-gone',
    category: 'sale_launch',
    label: 'Almost Gone',
    description: 'Urgency ad with countdown and low-stock framing.',
    scenePrompt:
      'Urgency-driven ad for {productName} with countdown timer and low-stock framing. Scarcity tone, bold CTA.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'flash-hour',
    command: '/flash-hour',
    category: 'sale_launch',
    label: 'Flash Hour',
    description: 'High-energy flash sale with big number and hard CTA.',
    scenePrompt:
      'High-energy flash-sale ad for {productName} with a big discount number and hard CTA. Rapid cuts, alarm-clock energy.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'bonus-reveal',
    command: '/bonus-reveal',
    category: 'sale_launch',
    label: 'Bonus Reveal',
    description: 'Gift-with-purchase bonus item revealed.',
    scenePrompt:
      'Gift-with-purchase ad for {productName} showing the bonus item revealed at the end. Surprise unbox moment.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'soon-teaser',
    command: '/soon-teaser',
    category: 'sale_launch',
    label: 'Soon Teaser',
    description: 'Mysterious pre-launch teaser hiding then hinting.',
    scenePrompt:
      'Mysterious pre-launch teaser for {productName} — product hidden then partially revealed. Dark mood, coming-soon type.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'price-drop',
    command: '/price-drop',
    category: 'sale_launch',
    label: 'Price Drop',
    description: 'Product shown first, then satisfying price-drop reveal.',
    scenePrompt:
      '{productName} shown first at full price feel, then satisfying animated price-drop reveal. Retail promo tone.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
  {
    id: 'back-again',
    command: '/back-again',
    category: 'sale_launch',
    label: 'Back Again',
    description: 'Restock announcement with excited in-demand tone.',
    scenePrompt:
      'Restock announcement for {productName} with excited, in-demand tone. Back-by-popular-demand messaging.',
    suggestedFormat: 'SHORT_FORM_15S',
    suggestedAspectRatio: '9:16',
    heroMediaType: 'video',
  },
];

export function getMarketingYatraPrompt(id: string): MarketingYatraPrompt | undefined {
  return MARKETING_YATRA_PROMPTS.find((p) => p.id === id);
}

export function listMarketingYatraPrompts(category?: MarketingYatraCategoryId): MarketingYatraPrompt[] {
  if (!category) return MARKETING_YATRA_PROMPTS;
  return MARKETING_YATRA_PROMPTS.filter((p) => p.category === category);
}

export type BuildGeminiPromptInput = {
  commandId: string;
  productName: string;
  productImageUrl?: string;
  stylingHints?: string;
  brandVoice?: string;
};

/** Build a paste-ready Gemini video command from Marketing Yatra slash syntax. */
export function buildGeminiVideoPrompt(input: BuildGeminiPromptInput): {
  prompt: MarketingYatraPrompt;
  geminiCommand: string;
  visualPrompt: string;
} {
  const prompt = getMarketingYatraPrompt(input.commandId);
  if (!prompt) {
    throw new Error(`Unknown Marketing Yatra command: ${input.commandId}`);
  }

  const productName = input.productName.trim() || 'your product';
  const scene = prompt.scenePrompt.replace(/\{productName\}/g, productName);
  const styling = input.stylingHints?.trim();
  const imageNote = input.productImageUrl?.trim()
    ? `[attached product photo: ${input.productImageUrl}]`
    : '[attach your product photo]';

  const parts = [
    `${prompt.command} + ${imageNote} + "${productName}"`,
    scene,
    styling ? `Extra styling: ${styling}.` : null,
    input.brandVoice ? `Brand voice: ${input.brandVoice}.` : null,
    'Output: short vertical product ad suitable for WhatsApp Status and Meta Reels.',
  ].filter(Boolean);

  const visualPrompt = parts.join(' ');
  const geminiCommand = `${prompt.command} + ${imageNote} + "${productName}"${styling ? ` + "${styling}"` : ''}`;

  return { prompt, geminiCommand, visualPrompt };
}
