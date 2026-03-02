export interface M3UChannel {
  name: string;
  logo: string;
  group: string;
  url: string;
  id: string;
}

export function parseM3U(content: string): M3UChannel[] {
  const lines = content.split('\n');
  const channels: M3UChannel[] = [];
  let currentChannel: Partial<M3UChannel> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      // Extract metadata
      const infoMatch = line.match(/#EXTINF:.*?,(.*)/);
      const logoMatch = line.match(/tvg-logo="(.*?)"/);
      const groupMatch = line.match(/group-title="(.*?)"/);

      currentChannel = {
        name: infoMatch ? infoMatch[1].trim() : 'Unknown Channel',
        logo: logoMatch ? logoMatch[1] : '',
        group: groupMatch ? groupMatch[1] : 'Uncategorized',
        id: Math.random().toString(36).substr(2, 9)
      };
    } else if (line.startsWith('http')) {
      if (currentChannel.name) {
        currentChannel.url = line;
        channels.push(currentChannel as M3UChannel);
        currentChannel = {};
      }
    }
  }

  return channels;
}
