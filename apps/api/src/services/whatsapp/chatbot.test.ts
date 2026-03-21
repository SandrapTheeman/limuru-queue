import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WhatsAppChatbot, DEPARTMENTS } from './chatbot.js';

describe('WhatsApp Chatbot - Unit Tests', () => {
  let chatbot: WhatsAppChatbot;

  beforeEach(() => {
    chatbot = new WhatsAppChatbot();
  });

  describe('Session Management', () => {
    it('should create a new session', () => {
      const session = chatbot.createSession('+254712345678');
      
      expect(session).toBeDefined();
      expect(session.phone).toBe('+254712345678');
      expect(session.state).toBe('idle');
      expect(session.language).toBe('en');
      expect(session.data).toEqual({});
      expect(session.messageCount).toBe(0);
    });

    it('should retrieve existing session', () => {
      chatbot.createSession('+254712345678');
      const session = chatbot.getSession('+254712345678');
      
      expect(session).toBeDefined();
      expect(session!.phone).toBe('+254712345678');
    });

    it('should return undefined for non-existent session', () => {
      const session = chatbot.getSession('+254700000000');
      expect(session).toBeUndefined();
    });

    it('should track message count', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'Hello');
      chatbot.processMessage('+254712345678', 'Help');
      
      const session = chatbot.getSession('+254712345678');
      expect(session!.messageCount).toBe(2);
    });

    it('should cleanup expired sessions', () => {
      const session = chatbot.createSession('+254712345678');
      session.updatedAt = new Date(Date.now() - 31 * 60 * 1000).toISOString();
      
      const cleaned = chatbot.cleanupExpiredSessions();
      
      expect(cleaned).toBe(1);
      expect(chatbot.getActiveSessionsCount()).toBe(0);
    });

    it('should not cleanup active sessions', () => {
      chatbot.createSession('+254712345678');
      
      const cleaned = chatbot.cleanupExpiredSessions();
      
      expect(cleaned).toBe(0);
      expect(chatbot.getActiveSessionsCount()).toBe(1);
    });
  });

  describe('Language Detection', () => {
    it('should detect Swahili language', () => {
      const detectLang = (chatbot as any).detectLanguage.bind(chatbot);
      
      expect(detectLang('asante sana')).toBe('sw');
      expect(detectLang('karibu hospitali')).toBe('sw');
      expect(detectLang('habari yako ndiyo')).toBe('sw');
    });

    it('should detect English language', () => {
      const detectLang = (chatbot as any).detectLanguage.bind(chatbot);
      
      expect(detectLang('Hello, I need help')).toBe('en');
      expect(detectLang('What is my queue position?')).toBe('en');
    });

    it('should default to English with insufficient Swahili words', () => {
      const detectLang = (chatbot as any).detectLanguage.bind(chatbot);
      
      expect(detectLang('asante')).toBe('en');
    });
  });

  describe('Command Handling', () => {
    it('should handle HELP command in English', () => {
      const response = chatbot.processMessage('+254712345678', 'HELP');
      
      expect(response.messages[0].text).toContain('Available Commands');
      expect(response.messages[0].text).toContain('REGISTER');
      expect(response.messages[0].text).toContain('STATUS');
    });

    it('should handle HELP command in Swahili', () => {
      const session = chatbot.createSession('+254712345678');
      session.language = 'sw';
      
      const response = chatbot.processMessage('+254712345678', 'USAIDIZI');
      
      expect(response.messages[0].text).toContain('Amri');
    });

    it('should handle REGISTER command and start registration flow', () => {
      const response = chatbot.processMessage('+254712345678', 'REGISTER');
      
      expect(response.newState).toBe('awaiting_name');
      expect(response.messages[0].text).toContain('full name');
    });

    it('should handle REGISTER command in Swahili', () => {
      const response = chatbot.processMessage('+254712345678', 'SAJILI');
      
      expect(response.newState).toBe('awaiting_name');
      expect(response.session!.language).toBe('sw');
    });

    it('should handle CANCEL command', () => {
      const session = chatbot.createSession('+254712345678');
      session.state = 'awaiting_name';
      
      const response = chatbot.processMessage('+254712345678', 'CANCEL');
      
      expect(response.messages[0].text).toContain('cancelled');
    });

    it('should handle STATUS command', () => {
      const response = chatbot.processMessage('+254712345678', 'STATUS');
      
      expect(response.messages[0].text).toContain('Check Your Status');
    });

    it('should reset session data on new registration', () => {
      const session = chatbot.createSession('+254712345678');
      session.data = { firstName: 'John', lastName: 'Doe' };
      session.state = 'awaiting_phone';
      
      chatbot.processMessage('+254712345678', 'REGISTER');
      
      expect(session.data).toEqual({});
      expect(session.state).toBe('awaiting_name');
    });
  });

  describe('Name Input Handling', () => {
    it('should accept valid full name', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      
      const response = chatbot.processMessage('+254712345678', 'John Doe');
      
      expect(response.newState).toBe('awaiting_phone');
      const session = chatbot.getSession('+254712345678')!;
      expect(session.data.firstName).toBe('John');
      expect(session.data.lastName).toBe('Doe');
      expect(session.data.fullName).toBe('John Doe');
    });

    it('should accept single name', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      
      const response = chatbot.processMessage('+254712345678', 'John');
      
      expect(response.newState).toBe('awaiting_phone');
      const session = chatbot.getSession('+254712345678')!;
      expect(session.data.firstName).toBe('John');
      expect(session.data.lastName).toBe('');
    });

    it('should reject too short name', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      
      const response = chatbot.processMessage('+254712345678', 'J');
      
      expect(response.newState).toBeUndefined();
      expect(response.messages[0].text).toContain('not sure');
    });

    it('should reject too long name', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      
      const response = chatbot.processMessage('+254712345678', 'A'.repeat(101));
      
      expect(response.newState).toBeUndefined();
    });
  });

  describe('Phone Input Handling', () => {
    it('should accept valid Kenyan phone number starting with 0', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      chatbot.processMessage('+254712345678', 'John Doe');
      
      const response = chatbot.processMessage('+254712345678', '0712345678');
      
      expect(response.newState).toBe('awaiting_department');
      const session = chatbot.getSession('+254712345678')!;
      expect(session.data.phone).toBe('+254712345678');
    });

    it('should accept valid Kenyan phone number with +254', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      chatbot.processMessage('+254712345678', 'John Doe');
      
      const response = chatbot.processMessage('+254712345678', '+254712345678');
      
      expect(response.newState).toBe('awaiting_department');
    });

    it('should reject invalid phone number', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      chatbot.processMessage('+254712345678', 'John Doe');
      
      const response = chatbot.processMessage('+254712345678', '12345');
      
      expect(response.newState).toBeUndefined();
      expect(response.messages[0].text).toContain('not sure');
    });
  });

  describe('Department Selection', () => {
    it('should accept department by code', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      chatbot.processMessage('+254712345678', 'John Doe');
      chatbot.processMessage('+254712345678', '0712345678');
      
      const response = chatbot.processMessage('+254712345678', 'MED');
      
      expect(response.newState).toBe('awaiting_yes_no');
      const session = chatbot.getSession('+254712345678')!;
      expect(session.data.department).toBe('MED');
    });

    it('should accept department by English name', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      chatbot.processMessage('+254712345678', 'John Doe');
      chatbot.processMessage('+254712345678', '0712345678');
      
      const response = chatbot.processMessage('+254712345678', 'General Medicine');
      
      expect(response.newState).toBe('awaiting_yes_no');
    });

    it('should accept department by Swahili name', () => {
      const session = chatbot.createSession('+254712345678');
      session.language = 'sw';
      chatbot.processMessage('+254712345678', 'SAJILI');
      chatbot.processMessage('+254712345678', 'John Doe');
      chatbot.processMessage('+254712345678', '0712345678');
      
      const response = chatbot.processMessage('+254712345678', 'Dawa za Kawaida');
      
      expect(response.newState).toBe('awaiting_yes_no');
      const updatedSession = chatbot.getSession('+254712345678')!;
      expect(updatedSession.data.department).toBe('MED');
    });

    it('should show department list for invalid selection', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      chatbot.processMessage('+254712345678', 'John Doe');
      chatbot.processMessage('+254712345678', '0712345678');
      
      const response = chatbot.processMessage('+254712345678', 'INVALID');
      
      expect(response.messages[0].type).toBe('interactive');
      expect(response.messages[0].sections).toBeDefined();
    });

    it('should confirm booking after department selection', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      chatbot.processMessage('+254712345678', 'John Doe');
      chatbot.processMessage('+254712345678', '0712345678');
      
      const response = chatbot.processMessage('+254712345678', 'MED');
      
      expect(response.messages[0].text).toContain('Booking Confirmation');
      expect(response.messages[0].text).toContain('John Doe');
      expect(response.messages[0].text).toContain('General Medicine');
    });
  });

  describe('Yes/No Handling', () => {
    it('should confirm booking with YES', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      chatbot.processMessage('+254712345678', 'John Doe');
      chatbot.processMessage('+254712345678', '0712345678');
      chatbot.processMessage('+254712345678', 'MED');
      
      const response = chatbot.processMessage('+254712345678', 'YES');
      
      expect(response.messages[0].text).toContain('all set');
      expect(response.messages[0].text).toContain('Ticket Number');
      const session = chatbot.getSession('+254712345678')!;
      expect(session.data.ticketNumber).toBeDefined();
    });

    it('should accept Y as yes', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      chatbot.processMessage('+254712345678', 'John Doe');
      chatbot.processMessage('+254712345678', '0712345678');
      chatbot.processMessage('+254712345678', 'MED');
      
      const response = chatbot.processMessage('+254712345678', 'Y');
      
      expect(response.messages[0].text).toContain('all set');
    });

    it('should accept NDIYO as yes in Swahili', () => {
      const session = chatbot.createSession('+254712345678');
      session.language = 'sw';
      chatbot.processMessage('+254712345678', 'SAJILI');
      chatbot.processMessage('+254712345678', 'John Doe');
      chatbot.processMessage('+254712345678', '0712345678');
      chatbot.processMessage('+254712345678', 'MED');
      
      const response = chatbot.processMessage('+254712345678', 'NDIYO');
      
      expect(response.messages[0].text).toContain('Ukujiandikisha');
    });

    it('should cancel with NO', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      chatbot.processMessage('+254712345678', 'John Doe');
      chatbot.processMessage('+254712345678', '0712345678');
      chatbot.processMessage('+254712345678', 'MED');
      
      const response = chatbot.processMessage('+254712345678', 'NO');
      
      expect(response.messages[0].text).toContain('cancelled');
    });

    it('should cancel with Hapana in Swahili', () => {
      const session = chatbot.createSession('+254712345678');
      session.language = 'sw';
      chatbot.processMessage('+254712345678', 'SAJILI');
      chatbot.processMessage('+254712345678', 'John Doe');
      chatbot.processMessage('+254712345678', '0712345678');
      chatbot.processMessage('+254712345678', 'MED');
      
      const response = chatbot.processMessage('+254712345678', 'HAPANA');
      
      expect(response.messages[0].text).toContain('Booking');
    });

    it('should reject invalid response', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      chatbot.processMessage('+254712345678', 'John Doe');
      chatbot.processMessage('+254712345678', '0712345678');
      chatbot.processMessage('+254712345678', 'MED');
      
      const response = chatbot.processMessage('+254712345678', 'MAYBE');
      
      expect(response.messages[0].text).toContain('not sure');
    });

    it('should enable SMS reminders on yes', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      chatbot.processMessage('+254712345678', 'John Doe');
      chatbot.processMessage('+254712345678', '0712345678');
      chatbot.processMessage('+254712345678', 'MED');
      chatbot.processMessage('+254712345678', 'YES');
      
      const response = chatbot.processMessage('+254712345678', 'YES');
      
      expect(response.messages[0].text).toContain('SMS reminders enabled');
    });

    it('should complete flow without SMS on no', () => {
      chatbot.createSession('+254712345678');
      chatbot.processMessage('+254712345678', 'REGISTER');
      chatbot.processMessage('+254712345678', 'John Doe');
      chatbot.processMessage('+254712345678', '0712345678');
      chatbot.processMessage('+254712345678', 'MED');
      chatbot.processMessage('+254712345678', 'YES');
      
      const response = chatbot.processMessage('+254712345678', 'NO');
      
      expect(response.messages[0].text).toContain('Thank you');
      expect(response.session!.state).toBe('complete');
    });
  });

  describe('Idle State Handling', () => {
    it('should show welcome message for new users', () => {
      const response = chatbot.processMessage('+254700000000', 'Hello');
      
      expect(response.messages[0].text).toContain('Welcome');
      expect(response.session!.state).toBe('idle');
    });

    it('should handle idle state REGISTER command', () => {
      const session = chatbot.createSession('+254712345678');
      session.state = 'idle';
      
      const response = chatbot.processMessage('+254712345678', 'REGISTER');
      
      expect(response.newState).toBe('awaiting_name');
    });

    it('should handle idle state STATUS command', () => {
      const session = chatbot.createSession('+254712345678');
      session.state = 'idle';
      
      const response = chatbot.processMessage('+254712345678', 'STATUS');
      
      expect(response.messages[0].text).toContain('Welcome');
    });
  });

  describe('Department List', () => {
    it('should have all expected departments', () => {
      const codes = DEPARTMENTS.map((d: { code: string }) => d.code);
      
      expect(codes).toContain('MED');
      expect(codes).toContain('PED');
      expect(codes).toContain('EMR');
      expect(codes).toContain('GYN');
      expect(codes).toContain('DEN');
      expect(codes).toContain('LAB');
    });

    it('should have bilingual department names', () => {
      const med = DEPARTMENTS.find((d: { code: string }) => d.code === 'MED');
      
      expect(med!.name).toBe('General Medicine');
      expect(med!.nameSw).toBe('Dawa za Kawaida');
    });
  });

  describe('Message Building', () => {
    it('should build interactive department list message', () => {
      const buildList = (chatbot as any).buildDepartmentList.bind(chatbot);
      const messages = buildList('+254712345678', 'en');
      
      expect(messages[0].type).toBe('interactive');
      expect(messages[0].sections).toHaveLength(1);
      expect(messages[0].sections![0].rows).toHaveLength(DEPARTMENTS.length);
    });

    it('should use Swahili in Swahili language', () => {
      const buildList = (chatbot as any).buildDepartmentList.bind(chatbot);
      const messages = buildList('+254712345678', 'sw');
      
      expect(messages[0].sections![0].title).toBe('Wodi');
    });
  });

  describe('Complete Registration Flow', () => {
    it('should complete full registration flow', () => {
      chatbot.processMessage('+254712345678', 'REGISTER');
      expect(chatbot.getSession('+254712345678')!.state).toBe('awaiting_name');
      
      chatbot.processMessage('+254712345678', 'Jane Wanjiku');
      expect(chatbot.getSession('+254712345678')!.state).toBe('awaiting_phone');
      
      chatbot.processMessage('+254712345678', '0712345678');
      expect(chatbot.getSession('+254712345678')!.state).toBe('awaiting_department');
      
      chatbot.processMessage('+254712345678', 'PED');
      expect(chatbot.getSession('+254712345678')!.state).toBe('awaiting_yes_no');
      
      const response = chatbot.processMessage('+254712345678', 'YES');
      expect(response.session!.data.ticketNumber).toBeDefined();
      
      const finalResponse = chatbot.processMessage('+254712345678', 'YES');
      expect(finalResponse.session!.state).toBe('complete');
    });
  });

  describe('KV Persistence', () => {
    it('should save sessions to KV', async () => {
      chatbot.createSession('+254712345678');
      
      const mockKV = {
        put: vi.fn(),
        get: vi.fn(),
        list: vi.fn(async () => ({ keys: [] })),
      };
      
      await chatbot.saveToKV(mockKV as any);
      
      expect(mockKV.put).toHaveBeenCalled();
    });

    it('should load sessions from KV', async () => {
      const storedSession = {
        phone: '+254700000000',
        state: 'awaiting_name',
        data: { firstName: 'Test' },
        language: 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
      };
      
      const mockKV = {
        put: vi.fn(),
        get: vi.fn(async () => JSON.stringify(storedSession)),
        list: vi.fn(async () => ({ 
          keys: [{ name: 'wa_session:+254700000000' }] 
        })),
      };
      
      await chatbot.loadFromKV(mockKV as any);
      
      const session = chatbot.getSession('+254700000000');
      expect(session).toBeDefined();
      expect(session!.data.firstName).toBe('Test');
    });
  });
});
