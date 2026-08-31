import { describe, expect, it } from 'vitest';
import { buildVideoRoomEmbedUrl } from './videoRoomUrl';

describe('buildVideoRoomEmbedUrl', () => {
  it('appends Jitsi hash config for meet.jit.si', () => {
    const out = buildVideoRoomEmbedUrl('https://meet.jit.si/medcorepat001');
    expect(out).toContain('meet.jit.si/medcorepat001');
    expect(out).toContain('config.prejoinPageEnabled=false');
    expect(out).toContain('config.disableDeepLinking=true');
  });

  it('preserves existing hash parameters when appending Jitsi config', () => {
    const out = buildVideoRoomEmbedUrl('https://meet.jit.si/medcorepat001#userInfo.displayName=Doctor');
    expect(out).toContain('userInfo.displayName=Doctor');
    expect(out).toContain('config.prejoinPageEnabled=false');
  });

  it('handles malformed URL by falling back to string concatenation', () => {
    const out = buildVideoRoomEmbedUrl('https://meet.jit.si:badport/room');
    expect(out).toBe('https://meet.jit.si:badport/room#config.prejoinPageEnabled=false&config.disableDeepLinking=true');
  });

  it('leaves Daily URLs unchanged', () => {
    const daily = 'https://example.daily.co/room';
    expect(buildVideoRoomEmbedUrl(daily)).toBe(daily);
  });
});
