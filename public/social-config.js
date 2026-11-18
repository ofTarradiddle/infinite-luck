// Add only social-profile URLs owned by the business. Never guess account handles.
export const SOCIAL_PROFILES = Object.freeze([]);

const HOSTS = new Set(['instagram.com', 'www.instagram.com', 'tiktok.com', 'www.tiktok.com', 'facebook.com', 'www.facebook.com', 'x.com', 'www.x.com', 'youtube.com', 'www.youtube.com', 'threads.net', 'www.threads.net', 'threads.com', 'www.threads.com', 'linkedin.com', 'www.linkedin.com']);

export function validSocialProfiles(profiles = SOCIAL_PROFILES) {
  if (!Array.isArray(profiles)) return [];
  return profiles.flatMap(profile => {
    if (!profile || typeof profile.name !== 'string' || !profile.name.trim() || typeof profile.url !== 'string') return [];
    try {
      const url = new URL(profile.url);
      if (url.protocol !== 'https:' || url.username || url.password || url.port || !HOSTS.has(url.hostname) || url.pathname === '/') return [];
      return [{ name: profile.name.trim().slice(0, 40), url: url.href }];
    } catch { return []; }
  });
}
