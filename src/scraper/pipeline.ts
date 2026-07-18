/**
 * Unified Pipeline Orchestrator
 *
 * Accepts a unified configuration array, handles both RSS and HTML discovery
 * tracks dynamically, channels all output URLs through the clean text
 * content extractor, and runs geo-fencing + classification before returning
 * the final, fully categorized article queue.
 */

import type { RawArticle } from './types';
import type { NewsSourceConfig } from './config';
import { fetchArticleUrlsFromRSS } from './parser-rss';
import { discoverLinksFromHTMLSection } from './parser-section';
import { extractCleanArticleText } from './parser-html';
import { isBiharCentric } from './geo-filter';
import { classifyArticle, evaluateContentQuality } from './classifier';

/**
 * Run the unified scraping pipeline across all configured sources.
 *
 * Flow:
 * 1. Discover articles via RSS or HTML section crawling
 * 2. Extract clean paragraph text from each article
 * 3. Run geo-fencing — drop non-Bihar articles
 * 4. Classify surviving articles into 8 categories
 * 5. Return fully categorized RawArticle[] queue
 *
 * @param sources - Array of NewsSourceConfig (RSS or HTML section sources)
 * @returns Array of RawArticle objects ready for database insertion
 */
export async function runUnifiedPipeline(
  sources: NewsSourceConfig[]
): Promise<RawArticle[]> {
  const ingestedArticlesLog: RawArticle[] = [];

  for (const source of sources) {
    console.log(
      `\n▶ [Pipeline] Launching discovery track for: ${source.sourceName}`
    );

    let candidateUrls: string[] = [];

    // Track Dynamic Branching
    if (source.discoveryType === 'rss') {
      const rssItems = await fetchArticleUrlsFromRSS([source.targetUrl]);
      candidateUrls = rssItems.map((item) => item.link);
    } else if (source.discoveryType === 'html_section') {
      candidateUrls = await discoverLinksFromHTMLSection(source);
    }

    // Remove duplicates found inside the same engine pass
    const executionQueue = Array.from(new Set(candidateUrls));
    console.log(
      `  [DISCOVER] ${executionQueue.length} potential articles for ${source.sourceName}`
    );

    if (executionQueue.length === 0) continue;

    // Sequential extraction → geo-fence → classify loop
    let extracted = 0;
    let geoPassed = 0;

    for (let index = 0; index < executionQueue.length; index++) {
      const url = executionQueue[index];
      console.log(
        `   [Processing] Article ${index + 1}/${executionQueue.length} — URL: ${url.substring(0, 50)}...`
      );

      // Mandatory 2-second delay to shield our runner IP
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        const bodyText = await extractCleanArticleText(url);

        if (!bodyText || bodyText.trim().length <= 100) continue;

        extracted++;

        // Use URL slug as a rough title if RSS didn't provide one
        const titleGuess = url
          .split('/')
          .pop()
          ?.replace(/[-_]/g, ' ')
          ?.replace(/\.\w+$/, '') || '';

        // ── Geo-Fencing Gate ──
        if (!isBiharCentric(titleGuess, bodyText)) {
          // Silent drop — not Bihar-relevant
          continue;
        }

        geoPassed++;

        // ── Matrix Classification ──
        const category = classifyArticle(titleGuess, bodyText);

        // ── Content Quality Evaluation ──
        const isNoise = evaluateContentQuality(titleGuess, bodyText);

        ingestedArticlesLog.push({
          title: titleGuess,
          sourceUrl: url,
          publishedAt: new Date(),
          rssSummary: '',
          fullContent: bodyText,
          sourceName: source.sourceName,
          category,
          isNoise,
        });
      } catch (err: any) {
        console.error(
          `  [Pipeline Error] Extraction failed for ${url}: ${err.message}`
        );
      }
    }

    console.log(
      `  [DONE] ${source.sourceName}: ${geoPassed}/${extracted} passed geo-fence (${executionQueue.length} discovered)`
    );
  }

  return ingestedArticlesLog;
}
