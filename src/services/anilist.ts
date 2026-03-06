const ANILIST_API_URL = 'https://graphql.anilist.co';

// Simple in-memory cache
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes

export const checkCache = (query: string, variables: any = {}) => {
  const cacheKey = JSON.stringify({ query, variables });
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    return cached.data;
  }
  return null;
};

export const fetchAniList = async (query: string, variables: any = {}, retries = 3) => {
  const cacheKey = JSON.stringify({ query, variables });
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    return cached.data;
  }

  const executeFetch = async (attempt: number, proxyIndex: number = 0): Promise<any> => {
    const urls = [
      ANILIST_API_URL,
      `https://corsproxy.io/?${encodeURIComponent(ANILIST_API_URL)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(ANILIST_API_URL)}`
    ];

    if (proxyIndex >= urls.length) {
      throw new Error('Network error: Failed to connect to AniList API. This might be caused by an adblocker or network issue. Try disabling your adblocker or checking your connection.');
    }

    const targetUrl = urls[proxyIndex];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        referrerPolicy: 'no-referrer',
        body: JSON.stringify({
          query,
          variables,
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429 && attempt < retries) {
          // Rate limited, wait and retry
          const retryAfter = parseInt(response.headers.get('Retry-After') || '1') * 1000;
          await new Promise(resolve => setTimeout(resolve, retryAfter || 1000));
          return executeFetch(attempt + 1, proxyIndex);
        }
        // If proxy fails with 5xx or 403, try next proxy
        if (response.status >= 500 || response.status === 403) {
          return executeFetch(0, proxyIndex + 1);
        }
        throw new Error(`AniList API responded with status ${response.status}`);
      }

      const json = await response.json();
      if (json.errors) {
        throw new Error(json.errors[0].message);
      }

      // Store in cache
      cache.set(cacheKey, { data: json.data, timestamp: Date.now() });
      
      return json.data;
    } catch (error) {
      // If network error or timeout, try next proxy
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn(`Fetch failed for ${targetUrl}, trying next proxy...`);
        return executeFetch(0, proxyIndex + 1);
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.warn(`Fetch timed out for ${targetUrl}, trying next proxy...`);
        return executeFetch(0, proxyIndex + 1);
      }

      if (attempt < retries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        return executeFetch(attempt + 1, proxyIndex);
      }
      throw error;
    }
  };

  return executeFetch(0, 0);
};

export const SEARCH_ANIME_QUERY = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page (page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media (search: $search, type: ANIME, sort: TRENDING_DESC) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
          large
          color
        }
        bannerImage
        description
        format
        status
        episodes
        genres
        averageScore
      }
    }
  }
`;

export const TRENDING_ANIME_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page (page: $page, perPage: $perPage) {
      media (type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC]) {
        id
        title {
          romaji
          english
        }
        coverImage {
          extraLarge
          large
          color
        }
        bannerImage
        description
        averageScore
        genres
      }
    }
  }
`;

export const POPULAR_ANIME_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page (page: $page, perPage: $perPage) {
      media (type: ANIME, sort: POPULARITY_DESC) {
        id
        title {
          romaji
          english
        }
        coverImage {
          extraLarge
          large
          color
        }
        bannerImage
        description
        averageScore
        genres
      }
    }
  }
`;

export const TOP_RATED_ANIME_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page (page: $page, perPage: $perPage) {
      media (type: ANIME, sort: SCORE_DESC) {
        id
        title {
          romaji
          english
        }
        coverImage {
          extraLarge
          large
          color
        }
        bannerImage
        description
        averageScore
        genres
      }
    }
  }
`;

export const RECENTLY_UPDATED_ANIME_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page (page: $page, perPage: $perPage) {
      media (type: ANIME, sort: UPDATED_AT_DESC) {
        id
        title {
          romaji
          english
        }
        coverImage {
          extraLarge
          large
          color
        }
        bannerImage
        description
        averageScore
        genres
      }
    }
  }
`;

export const ANIME_DETAILS_QUERY = `
  query ($id: Int) {
    Media (id: $id, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        extraLarge
        large
        color
      }
      bannerImage
      description
      format
      status
      episodes
      genres
      averageScore
      season
      seasonYear
      duration
      studios(isMain: true) {
        nodes {
          name
        }
      }
      nextAiringEpisode {
        episode
        timeUntilAiring
      }
      relations {
        edges {
          relationType
          node {
            id
            title {
              romaji
              english
            }
            coverImage {
              large
              extraLarge
            }
            type
            format
          }
        }
      }
      recommendations(sort: RATING_DESC, page: 1, perPage: 12) {
        nodes {
          mediaRecommendation {
            id
            title {
              romaji
              english
            }
            coverImage {
              large
              extraLarge
            }
          }
        }
      }
    }
  }
`;

export const convertM3U8toMP4 = (m3u8Url: string, animeTitle: string, episode: number) => {
  if (!m3u8Url) return '';
  
  // Example:
  // m3u8: https://vault-99.owocdn.top/stream/99/02/bc0890d8bdecea924fa980fb6a0bb0e65d2da26b3d60a35d9f9800a2bbe66862/uwu.m3u8
  // mp4: https://vault-99.kwik.cx/mp4/99/02/bc0890d8bdecea924fa980fb6a0bb0e65d2da26b3d60a35d9f9800a2bbe66862?file=Anilist_anime_titlw_episode.mp4
  
  try {
    // Replace domain and /stream with .kwik.cx/mp4
    let mp4Url = m3u8Url.replace(/\.[a-z0-9]+\.top\/stream/, '.kwik.cx/mp4');
    
    // Remove the trailing filename (e.g., /uwu.m3u8)
    mp4Url = mp4Url.substring(0, mp4Url.lastIndexOf('/'));
      
    const sanitizedTitle = animeTitle.replace(/[^a-zA-Z0-9]/g, '_');
    mp4Url += `?file=${sanitizedTitle}_Episode_${episode}.mp4`;
    
    return mp4Url;
  } catch (e) {
    console.error('Error converting URL:', e);
    return m3u8Url;
  }
};
