// ══════════════════════════════════════════════════════════════════════════════
// CLASSIFIER COMPARISON TEST: v1 (old) vs v2 (new)
// Runs both algorithms on every article in the database, counts differences,
// and samples changed articles for manual review.
// ══════════════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ══════════════════════════════════════════════════════════════════════════════
// V1 ALGORITHM (exact copy of the old categorizer.ts)
// ══════════════════════════════════════════════════════════════════════════════

const V1_NOISE_PHRASES = [
  'हनी ट्रैप', 'गैंगरेप', 'रेप', 'सेक्स', 'अश्लील', 'प्रेमी', 'प्रेमिका', 'सुहागरात', 'पोर्न', 'जिस्म',
  'honey trap', 'sex racket', 'porn', 'rape', 'lover', 'extramarital',
  'wangchuk', 'delhi hc', 'supreme court', 'सुप्रीम कोर्ट', 'दिल्ली हाईकोर्ट', 'sensex', 'nifty',
  'सेंसेक्स', 'निफ्टी', 'bollywood', 'bigg boss', 'cricket', 'ipl', 't20'
];

const V1_CRIME_STEMS = [
  'हत्या', 'मर्डर', 'गोली', 'गिरफ्तार', 'लूट', 'वसूली', 'अपहरण', 'फिरौती', 'तस्करी',
  'शव', 'लाश', 'एनकाउंटर', 'अपराध', 'माफिया', 'फायरिंग', 'घोटाला', 'फर्जी', 'रिश्वत',
  'घूस', 'धोखाधड़ी', 'सीबीआई', 'लाठीचार्ज', 'रंगदारी', 'चोरी', 'डकैती', 'बदमाश', 'दबंग',
  'smuggling', 'arrested', 'murder', 'extortion', 'kidnap', 'ransom', 'fir', 'police',
  'scam', 'fraud', 'fake', 'bribery', 'theft', 'robber', 'criminal', 'raid'
];

const V1_CATEGORY_MATRIX: Record<string, { stems: string[], exact: string[], negStems: string[] }> = {
  economy: {
    stems: ['कारोबार', 'निवेश', 'उद्योग', 'अर्थव्यवस्थ', 'व्यापार', 'स्टार्टअप', 'राजस्व', 'फैक्ट्र', 'investment', 'economy', 'startup', 'business', 'factory', 'market'],
    exact: ['बजट', 'जीडीपी', 'मिल', 'gdp'],
    negStems: ['हादसा', 'दुर्घटना']
  },
  infrastructure: {
    stems: ['सड़क', 'हाइवे', 'निर्माण', 'एक्सप्रेसवे', 'रेलवे', 'एयरपोर्ट', 'प्रोजेक्ट', 'मेट्रो', 'फोरलेन', 'फ्लाइओवर', 'infrastructure', 'highway', 'construction', 'airport', 'railway', 'expressway'],
    exact: ['पुल', 'पुलों', 'पुलिया', 'bridge'],
    negStems: ['हादसा', 'टक्कर', 'दुर्घटना', 'क्रैश']
  },
  agriculture: {
    stems: ['किसान', 'खेती', 'फसल', 'सिंचाई', 'मानसून', 'कृषि', 'उर्वरक', 'मंडी', 'agriculture', 'farmer', 'crop', 'irrigation', 'monsoon', 'fertilizer', 'cultivation'],
    exact: ['खाद', 'धान', 'गेहूं', 'गन्ना'],
    negStems: ['सुसाइड', 'आत्महत्या']
  },
  education: {
    stems: ['स्कूल', 'विश्वविद्यालय', 'कॉलेज', 'छात्र', 'परीक्षा', 'शिक्षक', 'शिक्षा', 'यूनिवर्सिटी', 'रिजल्ट', 'नामांकन', 'कुलपति', 'education', 'school', 'university', 'student', 'exam', 'teacher', 'college', 'admission'],
    exact: ['मेधावी'],
    negStems: ['मारपीट', 'बवाल', 'भिड़ंत']
  },
  healthcare: {
    stems: ['अस्पताल', 'डॉक्टर', 'मेडिकल', 'मरीज', 'बीमारी', 'स्वास्थ्य', 'नर्सिंग', 'हॉस्पिटल', 'हॉस्पीटल', 'क्लीनिक', 'वैक्सीन', 'ऑपरेशन', 'healthcare', 'hospital', 'medical', 'doctor', 'disease', 'patient', 'clinic', 'surgery', 'health'],
    exact: [],
    negStems: ['पोस्टमार्टम', 'शव', 'लाश', 'कत्ल', 'रेड', 'छापेमारी']
  },
  governance: {
    stems: ['नीतीश', 'तेजस्वी', 'चिराग', 'सरकार', 'कैबिनेट', 'योजना', 'नीति', 'प्रशासन', 'विधायक', 'सांसद', 'कलेक्टर', 'सचिवालय', 'घोषणा', 'governance', 'policy', 'cabinet', 'government', 'administration', 'municipality'],
    exact: ['सीएम', 'डीएम', 'नगर निगम', 'mla', 'mp', 'dm', 'cm'],
    negStems: ['चुनाव प्रचार', 'रैली', 'वोटबैंक']
  },
  industry: {
    stems: ['उद्योग', 'फैक्ट्री', 'कारखाना', 'मैन्युफैक्चरिंग', 'इंडस्ट्री', 'इन्वेस्टर्स', 'उद्यमी', 'industry', 'manufacturing', 'factory', 'plant', 'production', 'investor'],
    exact: ['प्लांट', 'मिल'],
    negStems: ['हादसा', 'आग', 'accident', 'fire']
  },
  environment: {
    stems: ['पर्यावरण', 'प्रदूषण', 'मौसम', 'बाढ़', 'बारिश', 'जलवायु', 'तापमान', 'जलजमाव', 'एक्यूआई', 'प्रदूषित', 'environment', 'weather', 'climate', 'pollution', 'flood', 'rain', 'forest', 'aqi', 'temperature'],
    exact: ['वन', 'पेड़', 'नदी', 'हवा', 'नदियों', 'नदियां'],
    negStems: ['चुनाव', 'मर्डर']
  }
};

function v1Tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()'"|?]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

function v1Classify(headline: string, synopsis: string): { category: string | null, is_noise: boolean } {
  const safeSynopsis = synopsis.substring(0, 800);
  const combinedRaw = (headline + ' ' + safeSynopsis).toLowerCase();
  const paddedRaw = ` ${combinedRaw.replace(/[.,/#!$%^&*;:{}=\-_`~()'"|?]/g, ' ').replace(/\s+/g, ' ')} `;
  const tokens = v1Tokenize(combinedRaw);

  for (const phrase of V1_NOISE_PHRASES) {
    if (paddedRaw.includes(` ${phrase.toLowerCase()} `)) {
      return { category: null, is_noise: true };
    }
  }

  let globalCrimeScore = 0;
  for (const token of tokens) {
    for (const crimeStem of V1_CRIME_STEMS) {
      if (token.startsWith(crimeStem.toLowerCase())) {
        globalCrimeScore += 50;
        break;
      }
    }
  }
  if (globalCrimeScore >= 50) {
    return { category: null, is_noise: true };
  }

  let bestCategory: string | null = null;
  let highestScore = 0;

  for (const [cat, rules] of Object.entries(V1_CATEGORY_MATRIX)) {
    let currentScore = 0;
    for (const token of tokens) {
      for (const posStem of rules.stems) {
        if (token.startsWith(posStem.toLowerCase())) currentScore += 25;
      }
      for (const exactMatch of rules.exact) {
        if (token === exactMatch.toLowerCase()) currentScore += 25;
      }
      for (const negStem of rules.negStems) {
        if (token.startsWith(negStem.toLowerCase())) currentScore -= 100;
      }
    }
    if (currentScore > highestScore) {
      highestScore = currentScore;
      bestCategory = cat;
    }
  }

  if (highestScore < 25) {
    return { category: null, is_noise: false };
  }

  return { category: bestCategory, is_noise: false };
}

// ══════════════════════════════════════════════════════════════════════════════
// V2 ALGORITHM (import from the new categorizer.ts)
// ══════════════════════════════════════════════════════════════════════════════
import { analyzeArticle as v2Classify } from './categorizer';

// ══════════════════════════════════════════════════════════════════════════════
// TEST RUNNER
// ══════════════════════════════════════════════════════════════════════════════

interface DiffRecord {
  id: string;
  headline: string;
  source: string;
  v1_category: string | null;
  v1_noise: boolean;
  v2_category: string | null;
  v2_noise: boolean;
  db_category: string;
}

async function runComparison() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   CLASSIFIER COMPARISON: v1 (old) vs v2 (new)    ');
  console.log('═══════════════════════════════════════════════════\n');

  // Fetch all articles
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, headline, synopsis, source, category, is_noise');

  if (error || !articles) {
    console.error('Failed to fetch articles:', error);
    return;
  }

  console.log(`Total articles in database: ${articles.length}\n`);

  // Classify each article with both algorithms
  const results: DiffRecord[] = [];
  let v1NoiseCount = 0;
  let v2NoiseCount = 0;
  let bothNoise = 0;
  let v1OnlyNoise = 0;
  let v2OnlyNoise = 0;
  let categoryChanged = 0;
  let bothSame = 0;
  let v1NullCat = 0;
  let v2NullCat = 0;

  // Track category distributions
  const v1Dist: Record<string, number> = {};
  const v2Dist: Record<string, number> = {};

  for (const article of articles) {
    const v1 = v1Classify(article.headline || '', article.synopsis || '');
    const v2 = v2Classify(article.headline || '', article.synopsis || '');

    if (v1.is_noise) v1NoiseCount++;
    if (v2.is_noise) v2NoiseCount++;
    if (v1.is_noise && v2.is_noise) bothNoise++;
    if (v1.is_noise && !v2.is_noise) v1OnlyNoise++;
    if (!v1.is_noise && v2.is_noise) v2OnlyNoise++;

    if (v1.category) v1Dist[v1.category] = (v1Dist[v1.category] || 0) + 1;
    if (v2.category) v2Dist[v2.category] = (v2Dist[v2.category] || 0) + 1;

    if (!v1.category) v1NullCat++;
    if (!v2.category) v2NullCat++;

    // Track differences
    if (v1.category !== v2.category || v1.is_noise !== v2.is_noise) {
      categoryChanged++;
      results.push({
        id: article.id,
        headline: article.headline || '(no headline)',
        source: article.source || '(unknown)',
        v1_category: v1.category,
        v1_noise: v1.is_noise,
        v2_category: v2.category,
        v2_noise: v2.is_noise,
        db_category: article.category || '(null)',
      });
    } else {
      bothSame++;
    }
  }

  // ── SUMMARY ──
  console.log('═══════════════════════════════════════════════════');
  console.log('                   SUMMARY                        ');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Total articles tested:        ${articles.length}`);
  console.log(`Articles with same result:    ${bothSame} (${((bothSame / articles.length) * 100).toFixed(1)}%)`);
  console.log(`Articles with different result: ${categoryChanged} (${((categoryChanged / articles.length) * 100).toFixed(1)}%)`);
  console.log('');

  console.log('── NOISE DETECTION ──');
  console.log(`v1 noise count:  ${v1NoiseCount} (${((v1NoiseCount / articles.length) * 100).toFixed(1)}%)`);
  console.log(`v2 noise count:  ${v2NoiseCount} (${((v2NoiseCount / articles.length) * 100).toFixed(1)}%)`);
  console.log(`Both noise:      ${bothNoise}`);
  console.log(`v1 only noise:   ${v1OnlyNoise} (v2 rescued these from noise)`);
  console.log(`v2 only noise:   ${v2OnlyNoise} (v2 caught these as noise)`);
  console.log('');

  console.log('── UNCATEGORIZED (null) ──');
  console.log(`v1 null category: ${v1NullCat}`);
  console.log(`v2 null category: ${v2NullCat}`);
  console.log('');

  console.log('── CATEGORY DISTRIBUTION: v1 ──');
  for (const [cat, count] of Object.entries(v1Dist).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(20)} ${count}`);
  }
  console.log('');

  console.log('── CATEGORY DISTRIBUTION: v2 ──');
  for (const [cat, count] of Object.entries(v2Dist).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(20)} ${count}`);
  }
  console.log('');

  // ── DETAILED DIFFS ──
  if (results.length === 0) {
    console.log('No differences found — both algorithms produce identical results.');
    return;
  }

  // Noise changes
  const noiseChanges = results.filter(r => r.v1_noise !== r.v2_noise);
  if (noiseChanges.length > 0) {
    console.log('═══════════════════════════════════════════════════');
    console.log(`  NOISE DETECTION CHANGES (${noiseChanges.length} articles)`);
    console.log('═══════════════════════════════════════════════════');
    for (const r of noiseChanges.slice(0, 20)) {
      const direction = r.v2_noise ? 'v1→v2: NOISE' : 'v1→v2: RESCUED';
      console.log(`\n  [${direction}]`);
      console.log(`  Headline: "${r.headline.substring(0, 80)}..."`);
      console.log(`  Source:   ${r.source}`);
      console.log(`  v1: category=${r.v1_category}, noise=${r.v1_noise}`);
      console.log(`  v2: category=${r.v2_category}, noise=${r.v2_noise}`);
      console.log(`  DB:  category=${r.db_category}`);
    }
    if (noiseChanges.length > 20) {
      console.log(`\n  ... and ${noiseChanges.length - 20} more noise changes.`);
    }
  }

  // Category changes (not noise)
  const catChanges = results.filter(r => !r.v1_noise && !r.v2_noise && r.v1_category !== r.v2_category);
  if (catChanges.length > 0) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log(`  CATEGORY CHANGES (${catChanges.length} articles)`);
    console.log('═══════════════════════════════════════════════════');

    // Group by transition
    const transitions: Record<string, DiffRecord[]> = {};
    for (const r of catChanges) {
      const key = `${r.v1_category || 'null'} → ${r.v2_category || 'null'}`;
      if (!transitions[key]) transitions[key] = [];
      transitions[key].push(r);
    }

    for (const [transition, records] of Object.entries(transitions).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n  ${transition} (${records.length} articles)`);
      for (const r of records.slice(0, 5)) {
        console.log(`    • "${r.headline.substring(0, 70)}..." [${r.source}]`);
        console.log(`      DB category: ${r.db_category}`);
      }
      if (records.length > 5) {
        console.log(`    ... and ${records.length - 5} more.`);
      }
    }
  }

  // ── WRITE CSV FOR MANUAL REVIEW ──
  const csvLines = ['id,headline,source,db_category,v1_category,v1_noise,v2_category,v2_noise,changed'];
  for (const article of articles) {
    const v1 = v1Classify(article.headline || '', article.synopsis || '');
    const v2 = v2Classify(article.headline || '', article.synopsis || '');
    const changed = (v1.category !== v2.category || v1.is_noise !== v2.is_noise) ? 'YES' : '';
    const headline = (article.headline || '').replace(/"/g, '""').substring(0, 100);
    csvLines.push(`"${article.id}","${headline}","${article.source || ''}","${article.category || ''}","${v1.category || ''}",${v1.is_noise},"${v2.category || ''}",${v2.is_noise},"${changed}"`);
  }

  const fs = await import('fs');
  fs.writeFileSync('classifier-comparison.csv', csvLines.join('\n'), 'utf-8');
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Full comparison exported to classifier-comparison.csv');
  console.log('  (Filter by "changed=YES" to review all differences)');
  console.log('═══════════════════════════════════════════════════');
}

runComparison().catch(console.error);
