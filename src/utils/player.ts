export const convertM3U8toMP4 = (m3u8Url: string, animeTitle: string, episode: number) => {
  if (!m3u8Url) return '';
  
  try {
    let mp4Url = m3u8Url.replace(/\.[a-z0-9]+\.top\/stream/, '.kwik.cx/mp4');
    mp4Url = mp4Url.substring(0, mp4Url.lastIndexOf('/'));
    const sanitizedTitle = animeTitle.replace(/[^a-zA-Z0-9]/g, '_');
    mp4Url += `?file=${sanitizedTitle}_Episode_${episode}.mp4`;
    return mp4Url;
  } catch (e) {
    console.error('Error converting URL:', e);
    return m3u8Url;
  }
};
