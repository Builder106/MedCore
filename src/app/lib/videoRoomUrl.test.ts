import { describe, expect, it } from 'vitest';
import { buildVideoRoomEmbedUrl } from './videoRoomUrl';

describe('buildVideoRoomEmbedUrl', () => {
  it('appends Jitsi hash config for meet.jit.si', () => {
    const out = buildVideoRoomEmbedUrl('https://meet.jit.si/medcorepat001');
    expect(out).toContain('meet.jit.si/medcorepat001');
    expect(out).toContain('config.prejoinPageEnabled=false');
    expect(out).toContain('config.disableDeepLinking=true');
  });

  it('leaves Daily URLs unchanged', () => {
    const daily = 'https://example.daily.co/room';
    expect(buildVideoRoomEmbedUrl(daily)).toBe(daily);
  });
});
