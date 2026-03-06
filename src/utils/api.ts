export const fetchWithProxy = async (targetUrl: string) => {
  // Try direct fetch first
  try {
    const response = await fetch(targetUrl);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn('Direct fetch failed, trying proxies...', e);
  }

  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(targetUrl)}`
  ];

  try {
    const response = await Promise.any(
      proxies.map(async (proxyUrl) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased to 10s
        
        try {
          const res = await fetch(proxyUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`Proxy ${proxyUrl} failed`);
          return await res.json();
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
      })
    );
    return response;
  } catch (error) {
    console.error('All fetch attempts failed:', error);
    throw new Error('Failed to fetch data from all sources');
  }
};
