import test from 'node:test';
import assert from 'node:assert/strict';
import { SOCIAL_PROFILES, validSocialProfiles } from '../public/social-config.js';

test('only explicitly configured secure profile URLs on supported social platforms are published', () => {
  assert.deepEqual(validSocialProfiles(), validSocialProfiles(SOCIAL_PROFILES));
  const profiles = validSocialProfiles([
    { name: ' Instagram ', url: 'https://www.instagram.com/example_roaster/' },
    { name: 'TikTok', url: 'https://www.tiktok.com/@example_roaster' },
    { name: 'insecure', url: 'http://www.instagram.com/example/' },
    { name: 'credentials', url: 'https://name:password@www.instagram.com/example/' },
    { name: 'spoof', url: 'https://instagram.com.evil.example/example/' },
    { name: 'unknown', url: 'https://unknown.example/profile' },
    { name: 'homepage is not a profile', url: 'https://www.instagram.com/' },
    { name: 'script', url: 'javascript:alert(1)' },
    { name: 'port', url: 'https://instagram.com:1234/example/' },
    { name: '', url: 'https://www.instagram.com/example/' },
    null, 12, {},
  ]);
  assert.deepEqual(profiles, [
    { name: 'Instagram', url: 'https://www.instagram.com/example_roaster/' },
    { name: 'TikTok', url: 'https://www.tiktok.com/@example_roaster' },
  ]);
  for (const input of [null, undefined, {}, '__proto__', false]) {
    if (input === undefined) continue;
    assert.deepEqual(validSocialProfiles(input), []);
  }
});
