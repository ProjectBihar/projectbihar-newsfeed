/**
 * Actor vs. Action Rule — Political & Crime Noise Filter.
 *
 * Litmus test: "If elections did not exist, or if this was an anonymous citizen,
 * does this headline physically impact the state's growth, infrastructure,
 * economy, or welfare?"
 *
 * - Pure electoral politics → DROP
 * - Pure localized crime → DROP
 * - Political rhetoric/quotes without policy → DROP
 * - Developmental action (even if politician named) → KEEP
 */

import { matchesAnyToken } from './token-match';

// ── Political noise: pure electoral/party activity ──
const POLITICAL_NOISE_EN = [
  // Electoral
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
  'bye-poll', 'byelection', 'join bjp', 'join rjd', 'join jdu',
  'joins bjp', 'joins rjd', 'joins jdu', 'party join', 'join party',
  // Political rhetoric / quotes without policy
  'said', 'says', 'stated', 'claimed', 'alleged', 'remarked',
  'hits out at', 'takes dig at', 'targets', 'targeting',
  'blames', 'blaming', 'accusing', 'accused of',
  'demands resignation', 'calls for resignation',
  'protest march', 'dharna', 'sit-in', 'hunger strike',
  'political statement', 'political attack', 'verbal attack',
  'war of words', 'heated exchange', 'clash',
  'party spokesperson', 'bjp spokesperson', 'rjd spokesperson', 'jdu spokesperson',
  'opposition attacks', 'ruling party attacks',
  'caste politics', 'caste card', 'identity politics',
  'vote bank', 'vote politics', 'electoral politics',
  // Rally / protest without developmental content
  'rally', 'holds rally', 'address rally', 'rally in',
  'protest', 'demonstration', 'agitation',
  'juloos', 'march', 'procession',
];

const POLITICAL_NOISE_HI = [
  'आरोप', 'हमला', 'निशाना', 'शामिल', 'टिकट', 'गठबंधन',
  'चुनावी', 'रैली', 'नामांकन', 'प्रत्याशी', 'पार्टी',
  'विरोधी', 'सत्ताधारी', 'मतदान', 'चुनाव प्रचार',
  'इस्तीफा', 'प्रवक्ता', 'अध्यक्ष', 'चुनाव',
  'उम्मीदवार', 'मतपत्र', 'बूथ', 'वोटर',
  // Political rhetoric / quotes
  'कहा', 'बोले', 'वक्तव्य', 'दावा', 'आरोप लगाया',
  'निशाने पर', 'हमलावर', 'जुबानी जंग', 'बयानबाजी',
  'धरना', 'प्रदर्शन', 'विरोध प्रदर्शन', 'अनशन',
  'राजनीतिक बयान', 'राजनीतिक हमला', 'जुबानी हमला',
  'पार्टी प्रवक्ता', 'भाजपा प्रवक्ता', 'राजद प्रवक्ता', 'जदयू प्रवक्ता',
  'जाति की राजनीति', 'जाति कार्ड', 'वोट बैंक',
  'चुनावी रणनीति', 'राजनीतिक रणनीति',
  // Rally / protest without developmental content
  'रैली को संबोधित', 'रैली में', 'जुलूस', 'मार्च',
  'प्रदर्शनकारी', 'आंदोलन', 'अनशन पर बैठे',
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
  // Additional crime patterns
  'stabbed', 'stabbing', 'slashed', 'attacked with',
  'lynched', 'mob violence', 'communal violence',
  'acid attack', 'sexual assault', 'molestation',
  'corruption case', 'corruption', 'disproportionate assets',
  'money laundering', 'ponzi scheme', 'pyramid scheme',
  'fake degree', 'fake certificate', 'forgery',
  'land grab', 'encroachment', 'illegal mining',
  'human trafficking', 'child labour', 'child abuse',
  'dowry death', 'dowry harassment',
  'road rage', 'hit-and-run',
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
  'हत्यारा', 'गिरफ्तारी', 'हथियार', 'बंदूक',
  'तस्कर', 'तस्करी', 'पकड़ा', 'पकड़े',
  // Additional crime patterns
  'चाकू मारा', 'चाकूबाजी', 'पत्थरबाजी',
  'भीड़ हिंसा', 'सांप्रदायिक हिंसा',
  'भ्रष्टाचार मामला', 'भ्रष्टाचार', 'आय से अधिक संपत्ति',
  'मनी लॉन्ड्रिंग', 'पोंजी स्कीम',
  'फर्जी डिग्री', 'फर्जीवाड़ा', 'जालसाजी',
  'जमीन कब्जा', 'अतिक्रमण', 'अवैध खनन',
  'मानव तस्करी', 'बाल श्रम', 'बाल शोषण',
  'दहेज मौत', 'दहेज उत्पीड़न',
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
  'MoU', 'capex', 'expenditure', 'disbursement',
  'pension scheme', 'insurance scheme', 'welfare scheme',
  'recruitment drive', 'job fair', 'skill development',
  'construction begins', 'work begins', 'completion',
  // Infrastructure / economy
  'highway', 'expressway', 'bridge', 'dam', 'canal', 'railway',
  'metro', 'airport', 'port', 'power plant', 'grid',
  'industrial park', 'sez', 'food park', 'textile park',
  'smart city', 'urban development', 'rural development',
  'water supply', 'sewage', 'drainage', 'irrigation',
  'digital india', 'broadband', 'fibre optic',
  // Education / health
  'university', 'college', 'school', 'hospital', 'phc', 'chc',
  'medical college', 'nursing', 'pharmacy',
  'scholarship', 'fellowship', 'research',
  'literacy', 'enrollment', 'dropout',
  // Agriculture
  'crop', 'harvest', 'mandi', 'procurement', 'msp',
  'fertilizer', 'pesticide', 'seed', 'farm',
  'dairy', 'poultry', 'fishery', 'livestock',
];

const DEVELOPMENTAL_SIGNALS_HI = [
  'कैबिनेट', 'उद्घाटन', 'शिलान्यास', 'बजट', 'योजना',
  'भर्ती', 'परीक्षा', 'परिणाम', 'टीकाकरण', 'बाढ़ चेतावनी',
  'सौर', 'पेंशन', 'बीमा', 'कल्याण', 'निर्माण', 'कार्य',
  'रिहाई', 'स्वीकृत', 'जारी', 'समर्पित',
  // Infrastructure / economy
  'हाईवे', 'एक्सप्रेसवे', 'पुल', 'बांध', 'नहर', 'रेलवे',
  'मेट्रो', 'हवाई अड्डा', 'बंदरगाह', 'पावर प्लांट', 'ग्रिड',
  'औद्योगिक पार्क', 'खाद्य पार्क', 'टेक्सटाइल पार्क',
  'स्मार्ट सिटी', 'शहरी विकास', 'ग्रामीण विकास',
  'जल आपूर्ति', 'सीवेज', 'ड्रेनेज', 'सिंचाई',
  // Education / health
  'विश्वविद्यालय', 'कॉलेज', 'विद्यालय', 'अस्पताल', 'प्राथमिक स्वास्थ्य केंद्र',
  'मेडिकल कॉलेज', 'नर्सिंग', 'फार्मेसी',
  'छात्रवृत्ति', 'शोध', 'अनुसंधान',
  'साक्षरता', 'नामांकन', 'ड्रपआउट',
  // Agriculture
  'फसल', 'कटाई', 'मंडी', 'खरीद', 'न्यूनतम समर्थन मूल्य',
  'उर्वरक', 'कीटनाशक', 'बीज', 'खेती',
  'डेयरी', 'पोल्ट्री', 'मत्स्य पालन', 'पशुपालन',
];

// ── Roundup / live-blog / daily digest noise ──
const ROUNDUP_NOISE_EN = [
  'news today live', 'breaking news live', 'live updates', 'live blog',
  'daily digest', 'top stories', 'headlines today', 'news roundup',
  'morning briefing', 'evening briefing', 'today in',
  'news you need to know', 'key developments', 'all you need to know',
  'in one place', 'complete coverage',
];

const ROUNDUP_NOISE_HI = [
  'आज की खबरें', 'ताजा समाचार', 'मुख्य समाचार', 'बड़ी खबरें',
  'प्रमुख खबरें', 'लाइव अपडेट', 'लाइव ब्लॉग', 'खबरों का पुलिंदा',
  'आज की प्रमुख खबरें', 'दिनभर की खबरें', 'शाम की खबरें',
  'सुबह की खबरें', 'खास खबरें', 'ये भी पढ़ें', 'पढ़ें आज की ताजा',
  'जानें आज की', 'बिहार ब्रेकिंग न्यूज़', 'बिहार की खबरें',
  'बिहार न्यूज़ टुडे', 'आज के मुख्य', 'ताजा खबर',
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

  // Roundup/live-blog → always noise
  if (hasRoundupNoise) {
    return true;
  }

  // Political/crime noise detected but NO developmental signal → drop
  if ((hasPoliticalNoise || hasCrimeNoise) && !hasDevelopmentalSignal) {
    return true;
  }

  return false;
}
