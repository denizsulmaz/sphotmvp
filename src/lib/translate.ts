/**
 * translate.ts
 * Free real-time blog translation using MyMemory API.
 * Results are cached in localStorage to avoid repeat calls.
 *
 * MyMemory free tier: 5,000 words/day (more than enough for blog browsing)
 * No API key required.
 */

const LANG_MAP: Record<string, string> = {
  en: "en",
  ru: "ru",
  ko: "ko",
  tr: "tr",
};

function cacheKey(slug: string, lang: string, field: string, textLength: number = 0) {
  return `sphot_blog_v4_${slug}_${lang}_${field}_${textLength}`;
}

/** Translate a text string from English to the target language. */
export async function translateText(
  text: string,
  targetLang: string,
  cacheId: string
): Promise<string> {
  // English is always the source — return as-is
  if (targetLang === "en" || !text) return text;

  const langCode = LANG_MAP[targetLang] ?? targetLang;
  const key = cacheKey(cacheId, targetLang, "", text.length);

  // Check localStorage cache first
  try {
    const cached = localStorage.getItem(key);
    if (cached) return cached;
  } catch {
    // localStorage not available (SSR guard)
    return text;
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text.slice(0, 500) // MyMemory max per request
    )}&langpair=en|${langCode}`;

    const res = await fetch(url);
    const data = await res.json();
    const translated: string = data?.responseData?.translatedText ?? text;

    // Cache result
    try {
      localStorage.setItem(key, translated);
    } catch {
      /* ignore storage errors */
    }

    return translated;
  } catch {
    // Network failure — fall back to English
    return text;
  }
}

/**
 * Translate multiple fields of a blog post at once.
 * Returns a map of { fieldName: translatedString }.
 */
export async function translateFields(
  fields: Record<string, string>,
  targetLang: string,
  slug: string
): Promise<Record<string, string>> {
  if (targetLang === "en") return fields;

  const results: Record<string, string> = {};
  const langCode = LANG_MAP[targetLang] ?? targetLang;

  await Promise.all(
    Object.entries(fields).map(async ([key, value]) => {
      const ck = cacheKey(slug, targetLang, key, value.length);
      try {
        const cached = localStorage.getItem(ck);
        if (cached) {
          results[key] = cached;
          return;
        }
      } catch {
        results[key] = value;
        return;
      }

      try {
        let translated = value;
        
        // Handle long content by translating line by line
        if (key === 'content' && value.length > 400) {
          const lines = value.split('\n');
          const translatedLines = [];
          
          for (const line of lines) {
            // Skip empty lines or markdown images to prevent syntax breakage
            if (!line.trim() || line.trim().startsWith('![')) {
              translatedLines.push(line);
              continue;
            }
            
            try {
              const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
                line.slice(0, 500)
              )}&langpair=en|${langCode}`;
              const res = await fetch(url);
              const data = await res.json();
              translatedLines.push(data?.responseData?.translatedText ?? line);
            } catch {
              translatedLines.push(line);
            }
            // Add a small delay to avoid hitting the free API rate limit too fast
            await new Promise(r => setTimeout(r, 150));
          }
          translated = translatedLines.join('\n');
        } else {
          // Standard single-shot translation for short fields
          const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
            value.slice(0, 500)
          )}&langpair=en|${langCode}`;
          const res = await fetch(url);
          const data = await res.json();
          translated = data?.responseData?.translatedText ?? value;
        }

        try {
          localStorage.setItem(ck, translated);
        } catch {
          /* ignore */
        }
        results[key] = translated;
      } catch {
        results[key] = value;
      }
    })
  );

  return results;
}
