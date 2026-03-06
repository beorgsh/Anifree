export const fetchWithProxy = async (targetUrl: string) => {
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
  ];

  let lastError;

  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (e) {
      console.warn(`Proxy ${proxyUrl} failed:`, e);
      lastError = e;
    }
  }

  // Try direct fetch as last resort
  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (e) {
      console.warn(`Direct fetch failed:`, e);
      lastError = e;
  }

  throw lastError || new Error('Failed to fetch data');
};
