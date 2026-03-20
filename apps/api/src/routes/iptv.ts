// IPTV Routes - Channel management and playback control
import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from '../types';
import { 
  getChannels, 
  getChannelById, 
  addChannel, 
  updateChannel, 
  removeChannel,
  getCurrentDisplay,
  getCurrentChannel,
  updateDisplay,
  parseM3UPlaylist,
  importChannelsFromPlaylist
} from '../services/iptv';
import { successResponse, errorResponse, now } from '../utils';

const iptv = new Hono<{ Bindings: Bindings }>();

const addChannelSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  category: z.string().optional(),
  logo: z.string().url().optional(),
  displayOrder: z.number().min(0).optional().default(0),
});

const updateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  category: z.string().optional(),
  logo: z.string().url().optional(),
  displayOrder: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

iptv.get('/channels', async (c) => {
  const db = c.env.DB;
  
  const channels = await getChannels(db);
  const current = await getCurrentDisplay(db);
  
  let currentChannel = null;
  let currentSince = null;
  if (current) {
    currentChannel = await getChannelById(db, current.channel_id);
    currentSince = current.since;
  }
  
  return c.json(successResponse({
    channels,
    current: currentChannel ? {
      id: currentChannel.id,
      name: currentChannel.name,
      url: currentChannel.url,
      since: currentSince,
    } : null,
  }));
});

iptv.post('/channels', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const body = await c.req.json().catch(() => null) as any;
  
  if (!user || !['admin'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }
  
  const channel = await addChannel(db, {
    name: body.name,
    url: body.url,
    category: body.category,
    logo: body.logo,
    displayOrder: body.displayOrder,
  });
  
  return c.json(successResponse(channel, 'Channel created'), 201);
});

iptv.put('/channels/:id', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const channelId = c.req.param('id');
  const body = await c.req.json().catch(() => null) as any;
  
  if (!user || !['admin'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }
  
  try {
    const channel = await updateChannel(db, channelId, {
      name: body.name,
      url: body.url,
      category: body.category,
      logo: body.logo,
      displayOrder: body.displayOrder,
      isActive: body.isActive,
    });
    
    return c.json(successResponse(channel, 'Channel updated'));
  } catch (error: any) {
    return c.json(errorResponse(error.message || 'Channel not found'), 404);
  }
});

iptv.delete('/channels/:id', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const channelId = c.req.param('id');
  
  if (!user || !['admin'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }
  
  try {
    await removeChannel(db, channelId);
    return c.json(successResponse(null, 'Channel deleted'));
  } catch (error: any) {
    return c.json(errorResponse(error.message || 'Channel not found'), 404);
  }
});

iptv.post('/channels/:id/play', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  const channelId = c.req.param('id');
  
  if (!user || !['admin', 'receptionist'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }
  
  try {
    const channel = await updateDisplay(db, channelId, user.userId);
    const channelDetails = await getChannelById(db, channelId);
    
    return c.json(successResponse({
      success: true,
      channel: {
        id: channelDetails?.id,
        name: channelDetails?.name,
        url: channelDetails?.url,
      },
      since: channel.since,
    }, 'Channel activated on all displays'));
  } catch (error: any) {
    return c.json(errorResponse(error.message || 'Channel not found'), 404);
  }
});

iptv.post('/upload', async (c) => {
  const db = c.env.DB;
  const user = (c as any).get('user');
  
  if (!user || !['admin'].includes(user.role)) {
    return c.json(errorResponse('Unauthorized'), 401);
  }
  
  try {
    const body = await c.req.parseBody();
    const file = body['playlist'];
    
    if (!file || !(file instanceof File)) {
      return c.json(errorResponse('No playlist file provided'), 400);
    }
    
    const content = await file.text();
    
    if (!content.includes('#EXTM3U')) {
      return c.json(errorResponse('Invalid M3U file: missing #EXTM3U header'), 400);
    }
    
    const playlist = parseM3UPlaylist(content);
    
    if (playlist.channels.length === 0) {
      return c.json(errorResponse('No channels found in playlist'), 400);
    }
    
    const channels = await importChannelsFromPlaylist(db, playlist.channels);
    
    return c.json(successResponse({
      channels: channels.map(ch => ({ name: ch.name, url: ch.url })),
      message: `Successfully imported ${channels.length} channels from playlist`,
    }, 'Playlist imported'));
  } catch (error: any) {
    return c.json(errorResponse(error.message || 'Failed to parse playlist'), 400);
  }
});

iptv.get('/current', async (c) => {
  const db = c.env.DB;
  
  const channel = await getCurrentChannel(db);
  
  if (!channel) {
    return c.json(successResponse(null, 'No channel currently playing'));
  }
  
  return c.json(successResponse({
    id: channel.id,
    name: channel.name,
    url: channel.url,
    category: channel.category,
    logo: channel.logo,
  }));
});

iptv.get('/health', async (c) => {
  const db = c.env.DB;
  
  const channel = await getCurrentChannel(db);
  
  if (!channel) {
    return c.json(successResponse({
      healthy: false,
      message: 'No channel configured',
    }));
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(channel.url, { 
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    return c.json(successResponse({
      healthy: response.ok,
      channel_id: channel.id,
      channel_name: channel.name,
      status: response.ok ? 'stream accessible' : 'stream unreachable',
    }));
  } catch {
    return c.json(successResponse({
      healthy: false,
      channel_id: channel.id,
      channel_name: channel.name,
      status: 'stream check failed',
    }));
  }
});

export { iptv };
