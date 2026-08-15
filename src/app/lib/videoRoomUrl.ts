export function buildVideoRoomEmbedUrl(roomUrl: string): string {
  if (!roomUrl.includes('meet.jit.si')) {
    return roomUrl;
  }
  try {
    const u = new URL(roomUrl);
    const jitsiConfig = ['config.prejoinPageEnabled=false', 'config.disableDeepLinking=true'];
    const existing = u.hash ? u.hash.replace(/^#/, '') : '';
    const merged = existing ? `${existing}&${jitsiConfig.join('&')}` : jitsiConfig.join('&');
    u.hash = merged;
    return u.toString();
  } catch {
    return `${roomUrl}#config.prejoinPageEnabled=false&config.disableDeepLinking=true`;
  }
}
