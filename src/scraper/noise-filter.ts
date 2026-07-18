/**
 * Actor vs. Action Rule — Political & Crime Noise Filter.
 *
 * Litmus test: "If elections did not exist, or if this was an anonymous citizen,
 * does this headline physically impact the state's growth, infrastructure,
 * economy, or welfare?"
 *
 * - Pure electoral politics → DROP
 * - Pure localized crime → DROP
 * - Developmental action (even if politician named) → KEEP
 */

import { matchesAnyToken } from './token-match';

// ── Political noise: pure electoral/party activity ──
const POLITICAL_NOISE_EN = [
  'slams', 'accuses', 'takes a dig', 'hits out', 'joins party',
  'switches party', 'switched party', 'alliance', 'seat-sharing',
  'ticket distribution', 'election rally', 'by-election', 'bypoll',
  'files nomination', 'withdraws candidature', 'withdraws nomination',
  'floor test', 'trust vote', 'party feud', 'internal rift',
  'opposition leader', 'ruling party', 'coalition', 'pre-poll',
  'post-poll', 'poll-bound', 'election commission', 'nomination paper',
  'campaigned', 'campaigning', 'stump speech', 'rally venue',
  'resigns', 'resigned', 'resignation', 'spokesperson',
  'party chief', 'party leader', 'party president', 'party work',
  'candidate', 'polls', 'election', 'nominated', 'nomination',
  'bye-poll', 'byelection', 'bypoll', 'join bjp', 'join rjd', 'join jdu',
  'joins bjp', 'joins rjd', 'joins jdu', 'party join', 'join party',
];

const POLITICAL_NOISE_HI = [
  'आरोप', 'हमला', 'निशाना', 'शामिल', 'टिकट', 'गठबंधन',
  'चुनावी', 'रैली', 'नामांकन', 'प्रत्याशी', 'पार्टी',
  'विरोधी', 'सत्ताधारी', 'मतदान', 'चुनाव प्रचार',
  'इस्तीफा', 'प्रवक्ता', 'अध्यक्ष', 'चुनाव',
  'उम्मीदवार', 'मतपत्र', 'बूथ', 'वोटर',
];

// ── Crime noise: pure localized crime ──
const CRIME_NOISE_EN = [
  'arrested for', 'arrested', 'arrest', 'murder accused', 'shot dead',
  'shot and killed', 'contract killing', 'personal dispute', 'family feud',
  'hit and run', 'drunk driving', 'robbery accused', 'loot',
  'dacoity', 'extortion', 'kidnapping', 'ransom',
  'honour killing', 'domestic violence', 'assault case',
  'firing incident', 'open fire', 'gun battle', 'encounter',
  'fugitive', 'shooter', 'custody', 'bail',
  'verdict', 'sentenced', 'convicted', 'accused',
  'crime', 'criminal', 'murder', 'killed',
  'liquor', 'drugs', 'smuggled', 'seized', 'confiscated',
];

const CRIME_NOISE_HI = [
  'हत्या', 'अरेस्ट', 'गिरफ्तार', 'गोलीबारी', 'लूट', 'डकैती',
  'फायरिंग', 'मुठभेड़', 'अपहरण', 'रंगदारी',
  'घरेलू हिंसा', 'सम्मान हत्या',
  'शूटर', 'फरार', 'पुलिस', 'रिश्वत', 'शराब', 'नशा',
  'चोरी', 'जब्त', 'हिरासत', 'न्यायालय', 'अदालत', 'सजा', 'दोषी',
  'आपराधिक', 'अपराध', 'मामला', 'एफआईआर', 'प्राथमिकी',
  'मौत', 'मृत्यु', 'हमला', 'वारदात', 'लाश',
  'शराबबंदी', 'शराब तस्करी', 'नशीला',
  'खुरानी', 'बेहोश', 'लूटपाट', 'डकैत', 'सामूहिक',
  'हत्यारा', 'गिरफ्तारी', 'गिरफ्तार', 'हथियार', 'बंदूक',
  'तस्कर', 'तस्करी', 'पकड़ा', 'पकड़े',
];

// ── Developmental signals: overrides noise if present ──
const DEVELOPMENTAL_SIGNALS_EN = [
  'cabinet approves', 'cabinet cleared', 'inaugurates', 'inaugurated',
  'foundation stone', 'ground breaking', 'laying foundation',
  'signs mou', 'signed mou', 'fund allocation', 'allocated',
  'budget', 'policy', 'scheme launched', 'scheme announced',
  'recruitment', 'exam result', 'exam results', 'results declared',
  'vaccine drive', 'vaccination drive', 'flood warning', 'flood alert',
  'solar plant', 'solar panel', 'solar power',
  'inauguration ceremony', 'commissioned', 'operationalized',
  'approves project', 'sanctioned', 'released funds',
  'flag off', 'flagged off', 'dedicated to nation',
  ' MoU ', 'capex', 'expenditure', 'disbursement',
  'pension scheme', 'insurance scheme', 'welfare scheme',
  'recruitment drive', 'job fair', 'skill development',
  'construction begins', 'work begins', 'completion',
];

const DEVELOPMENTAL_SIGNALS_HI = [
  'कैबिनेट', 'उद्घाटन', 'शिलान्यास', 'बजट', 'योजना',
  'भर्ती', 'परीक्षा', 'परिणाम', 'टीकाकरण', 'बाढ़ चेतावनी',
  'सौर', 'पेंशन', 'बीमा', 'कल्याण', 'निर्माण', 'कार्य',
  'रिहाई', 'स्वीकृत', 'जारी', 'समर्पित',
];

// ── Roundup / live-blog / daily digest noise ──
// Generic compilation headlines that are NOT individual news stories
const ROUNDUP_NOISE_EN = [
  'news today live',
  'breaking news live',
  'live updates',
  'live blog',
  'daily digest',
  'top stories',
  'headlines today',
  'news roundup',
  'morning briefing',
  'evening briefing',
  'today in',
  'news you need to know',
  'key developments',
  'all you need to know',
  'in one place',
  'complete coverage',
];

const ROUNDUP_NOISE_HI = [
  'आज की खबरें',
  'ताजा समाचार',
  'मुख्य समाचार',
  'बड़ी खबरें',
  'प्रमुख खबरें',
  'लाइव अपडेट',
  'लाइव ब्लॉग',
  'खबरों का पुलिंदा',
  'आज की प्रमुख खबरें',
  'दिनभर की खबरें',
  'शाम की खबरें',
  'सुबह की खबरें',
  'खास खबरें',
  'ये भी पढ़ें',
  'पढ़ें आज की ताजा',
  'जानें आज की',
  'बिहार ब्रेकिंग न्यूज़',
  'बिहार की खबरें',
  'बिहार न्यूज़ टुडे',
  'आज के मुख्य',
  'ताजा खबर',
];

/**
 * Returns true if the article is pure noise (political/crime/roundup) with NO
 * developmental signal. Returns false if the article should be kept.
 */
export function isNoiseArticle(headline: string, synopsis: string): boolean {
  const text = `${headline} ${synopsis}`;

  const hasPoliticalNoise =
    matchesAnyToken(text, POLITICAL_NOISE_EN) ||
    matchesAnyToken(text, POLITICAL_NOISE_HI);

  const hasCrimeNoise =
    matchesAnyToken(text, CRIME_NOISE_EN) ||
    matchesAnyToken(text, CRIME_NOISE_HI);

  const hasRoundupNoise =
    matchesAnyToken(text, ROUNDUP_NOISE_EN) ||
    matchesAnyToken(text, ROUNDUP_NOISE_HI);

  const hasDevelopmentalSignal =
    matchesAnyToken(text, DEVELOPMENTAL_SIGNALS_EN) ||
    matchesAnyToken(text, DEVELOPMENTAL_SIGNALS_HI);

  // Roundup/live-blog → always noise (no developmental override needed)
  if (hasRoundupNoise) {
    return true;
  }

  // Political/crime noise detected but NO developmental signal → drop
  if ((hasPoliticalNoise || hasCrimeNoise) && !hasDevelopmentalSignal) {
    return true;
  }

  return false;
}
