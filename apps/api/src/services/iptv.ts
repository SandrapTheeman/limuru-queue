// IPTV Service - Channel management and stream handling
import { generateId, now } from '../utils';
import { IPTVChannel } from '../db/schema';

export interface ParsedChannel {
  name: string;
  url: string;
  duration?: number;
  attributes?: Record<string, string>;
}

export interface M3UPlaylist {
  channels: ParsedChannel[];
}

export interface CurrentChannel {
  id: string;
  channel_id: string;
  since: string;
  updated_by: string | null;
}

export function parseM3UPlaylist(content: string): M3UPlaylist {
  const lines = content.split('\n');
  const channels: ParsedChannel[] = [];
  let currentChannel: Partial<ParsedChannel> = {};
  let currentAttributes: Record<string, string> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] || '').trim();

    if (line.startsWith('#EXTINF:')) {
      const extInfMatch = line.match(/#EXTINF:(-?\d+)(.*)/);
      if (extInfMatch && extInfMatch[1]) {
        currentChannel.duration = parseInt(extInfMatch[1], 10);
        
        const attributesStr = extInfMatch[2] || '';
        const attrMatch = attributesStr.match(/tvg-logo="([^"]*)"/);
        if (attrMatch && attrMatch[1]) {
          currentAttributes['logo'] = attrMatch[1];
        }
        const groupMatch = attributesStr.match(/group-title="([^"]*)"/);
        if (groupMatch && groupMatch[1]) {
          currentAttributes['category'] = groupMatch[1];
        }
        const nameMatch = attributesStr.match(/,(.+)$/);
        if (nameMatch && nameMatch[1]) {
          currentChannel.name = nameMatch[1].trim();
        }
        
        currentChannel.attributes = { ...currentAttributes };
      }
    } else if (line && !line.startsWith('#')) {
      currentChannel.url = line;
      if (currentChannel.name && currentChannel.url) {
        channels.push({
          name: currentChannel.name,
          url: currentChannel.url,
          duration: currentChannel.duration,
          attributes: { ...currentAttributes },
        });
        currentChannel = {};
        currentAttributes = {};
      }
    }
  }

  return { channels };
}

export async function getChannels(db: D1Database): Promise<IPTVChannel[]> {
  const result = await db.prepare(`
    SELECT * FROM iptv_channels 
    WHERE is_active = 1 
    ORDER BY display_order ASC
  `).all();
  
  return result.results as unknown as IPTVChannel[];
}

export async function getChannelById(db: D1Database, channelId: string): Promise<IPTVChannel | null> {
  const result = await db.prepare(`
    SELECT * FROM iptv_channels WHERE id = ?
  `).bind(channelId).first();
  
  return result as IPTVChannel | null;
}

export async function addChannel(
  db: D1Database,
  data: {
    name: string;
    url: string;
    category?: string;
    logo?: string;
    displayOrder?: number;
  }
): Promise<IPTVChannel> {
  const id = generateId('ch');
  const createdAt = now();
  
  await db.prepare(`
    INSERT INTO iptv_channels (id, name, url, category, logo, is_active, display_order, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    id,
    data.name,
    data.url,
    data.category || null,
    data.logo || null,
    data.displayOrder ?? 0,
    createdAt
  ).run();
  
  const channel = await getChannelById(db, id);
  if (!channel) throw new Error('Failed to create channel');
  
  return channel;
}

export async function updateChannel(
  db: D1Database,
  channelId: string,
  data: {
    name?: string;
    url?: string;
    category?: string;
    logo?: string;
    displayOrder?: number;
    isActive?: boolean;
  }
): Promise<IPTVChannel> {
  const channel = await getChannelById(db, channelId);
  if (!channel) throw new Error('Channel not found');
  
  const updates: string[] = [];
  const params: unknown[] = [];
  
  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.url !== undefined) {
    updates.push('url = ?');
    params.push(data.url);
  }
  if (data.category !== undefined) {
    updates.push('category = ?');
    params.push(data.category);
  }
  if (data.logo !== undefined) {
    updates.push('logo = ?');
    params.push(data.logo);
  }
  if (data.displayOrder !== undefined) {
    updates.push('display_order = ?');
    params.push(data.displayOrder);
  }
  if (data.isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(data.isActive ? 1 : 0);
  }
  
  if (updates.length > 0) {
    updates.push('created_at = ?');
    params.push(now());
    params.push(channelId);
    
    await db.prepare(`
      UPDATE iptv_channels SET ${updates.join(', ')} WHERE id = ?
    `).bind(...params).run();
  }
  
  const updated = await getChannelById(db, channelId);
  if (!updated) throw new Error('Failed to update channel');
  
  return updated;
}

export async function removeChannel(db: D1Database, channelId: string): Promise<void> {
  const channel = await getChannelById(db, channelId);
  if (!channel) throw new Error('Channel not found');
  
  await db.prepare(`
    UPDATE iptv_channels SET is_active = 0 WHERE id = ?
  `).bind(channelId).run();
}

export async function getCurrentDisplay(db: D1Database): Promise<CurrentChannel | null> {
  const result = await db.prepare(`
    SELECT * FROM iptv_current WHERE id = 1
  `).first();
  
  return result as CurrentChannel | null;
}

export async function getCurrentChannel(db: D1Database): Promise<IPTVChannel | null> {
  const current = await getCurrentDisplay(db);
  if (!current) return null;
  
  return getChannelById(db, current.channel_id);
}

export async function updateDisplay(
  db: D1Database,
  channelId: string,
  updatedBy?: string
): Promise<CurrentChannel> {
  const channel = await getChannelById(db, channelId);
  if (!channel) throw new Error('Channel not found');
  
  const updatedAt = now();
  
  const existing = await getCurrentDisplay(db);
  
  if (existing) {
    await db.prepare(`
      UPDATE iptv_current 
      SET channel_id = ?, since = ?, updated_by = ?
      WHERE id = 1
    `).bind(channelId, updatedAt, updatedBy || null).run();
  } else {
    await db.prepare(`
      INSERT INTO iptv_current (id, channel_id, since, updated_by)
      VALUES (1, ?, ?, ?)
    `).bind(channelId, updatedAt, updatedBy || null).run();
  }
  
  return {
    id: '1',
    channel_id: channelId,
    since: updatedAt,
    updated_by: updatedBy || null,
  };
}

export async function importChannelsFromPlaylist(
  db: D1Database,
  channels: ParsedChannel[]
): Promise<IPTVChannel[]> {
  const importedChannels: IPTVChannel[] = [];
  
  for (const channelData of channels) {
    const attrs = channelData.attributes || {};
    const channel = await addChannel(db, {
      name: channelData.name,
      url: channelData.url,
      category: 'category' in attrs ? attrs['category'] : undefined,
      logo: 'logo' in attrs ? attrs['logo'] : undefined,
    });
    importedChannels.push(channel);
  }
  
  return importedChannels;
}

export async function checkStreamHealth(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
