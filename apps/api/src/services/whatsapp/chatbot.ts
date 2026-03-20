// WhatsApp Chatbot Service - State Machine for Patient Self-Registration
// Limuru Cottage Hospital Queue Management System

export type WhatsAppSessionState = 
  | 'idle'
  | 'awaiting_name'
  | 'awaiting_phone'
  | 'awaiting_department'
  | 'awaiting_yes_no'
  | 'awaiting_feedback'
  | 'complete'
  | 'cancelled';

export interface WhatsAppUserSession {
  phone: string;
  state: WhatsAppSessionState;
  data: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    phone?: string;
    department?: string;
    appointmentDate?: string;
    ticketNumber?: string;
    queuePosition?: number;
    estimatedWait?: number;
    lastQuestion?: string;
    lastYesNoContext?: string;
    hmsPatientId?: string;
  };
  language: 'en' | 'sw';
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface WhatsAppMessage {
  from: string;
  to: string;
  body: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'location' | 'button_reply' | 'interactive';
}

export interface WhatsAppOutgoingMessage {
  to: string;
  type: 'text' | 'interactive' | 'image' | 'template';
  text?: string;
  body?: string;
  footer?: string;
  header?: string;
  buttons?: Array<{
    type: 'reply';
    title: string;
    id: string;
  }>;
  sections?: Array<{
    title?: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
  template?: {
    name: string;
    language: { code: string };
    components: Array<{
      type: string;
      parameters: Array<{ type: string; text: string }>;
    }>;
  };
}

export interface ChatbotResponse {
  messages: WhatsAppOutgoingMessage[];
  newState?: WhatsAppSessionState;
  session?: WhatsAppUserSession;
}

const MESSAGES = {
  en: {
    welcome: (name: string) => 
      `👋 *Welcome to Limuru Cottage Hospital, ${name}!*\n\n` +
      `I'm your virtual assistant. I can help you:\n` +
      `• Register for the queue\n` +
      `• Check your queue position\n` +
      `• Get estimated wait times\n` +
      `• Update your appointment\n\n` +
      `How can I help you today?`,
    welcomeAnonymous: () =>
      `👋 *Karibu Limuru Cottage Hospital!*\n\n` +
      `I'm your virtual assistant. I can help you:\n` +
      `• Register for the queue\n` +
      `• Check your queue position\n` +
      `• Get estimated wait times\n\n` +
      `How can I help you today?`,
    askName: () =>
      `📝 *New Patient Registration*\n\n` +
      `Let's get you registered. First, what is your *full name*?`,
    askPhone: () =>
      `📱 Great! What's your *phone number*? (e.g., +254712345678)\n\n` +
      `We'll use this to send you queue updates.`,
    askDepartment: () =>
      `🏥 Which department do you need?\n\n` +
      `Please select from the options below:`,
    confirmBooking: (name: string, department: string) =>
      `✅ *Booking Confirmation*\n\n` +
      `Name: ${name}\n` +
      `Department: ${department}\n\n` +
      `Is this correct?`,
    bookingConfirmed: (ticketNumber: string, position: string, waitTime: string) =>
      `🎫 *You're all set!*\n\n` +
      `Ticket Number: *${ticketNumber}*\n` +
      `Current Position: *${position}*\n` +
      `Estimated Wait: *${waitTime}*\n\n` +
      `We'll notify you when it's your turn.\n\n` +
      `Would you like to receive SMS reminders?`,
    positionCheck: (ticketNumber: string, position: string, waitTime: string, status: string) =>
      `📊 *Queue Status for ${ticketNumber}*\n\n` +
      `Current Position: *#${position}*\n` +
      `Estimated Wait: *${waitTime}*\n` +
      `Status: *${status}*\n\n` +
      `We'll send you an update when you're close to being called.`,
    help: () =>
      `ℹ️ *Available Commands:*\n\n` +
      `• *REGISTER* - Start patient registration\n` +
      `• *STATUS* - Check your queue position\n` +
      `• *CANCEL* - Cancel your booking\n` +
      `• *HELP* - Show this message\n\n` +
      `Or just type your question and I'll help!`,
    cancelConfirm: () =>
      `❌ Are you sure you want to cancel your booking?\n\n` +
      `This cannot be undone.`,
    cancelled: () =>
      `🗑️ Your booking has been cancelled.\n\n` +
      `If you need to re-register, just send *REGISTER*.`,
    invalidOption: () =>
      `❓ I'm not sure I understood that.\n\n` +
      `Please select one of the options below or type *HELP* for assistance.`,
    thankYou: () =>
      `🙏 Thank you for using Limuru Cottage Hospital!\n\n` +
      `Take care and we look forward to seeing you! 🌻`,
    smsReminderConfirm: () =>
      `📱 Would you like to receive SMS reminders when you're close to being called?`,
    smsEnabled: () =>
      `✅ SMS reminders enabled!\n\n` +
      `We'll send you a text when you're about 3 patients away from being called.`,
    error: () =>
      `⚠️ Something went wrong. Please try again or type *HELP* for assistance.`,
  },
  sw: {
    welcome: (name: string) =>
      `👋 *Karibu Limuru Cottage Hospital, ${name}!*\n\n` +
      `Mimi ni msaidizi wako wa kidijitali. Naweza kukusaidia:\n` +
      `• Jisajili kwenye foleni\n` +
      `• Angalia nafasi yako kwenye foleni\n` +
      `• Pata muda wa kusubiri\n` +
      `• Sasisha apointment yako\n\n` +
      `Nikusaidie vipi leo?`,
    welcomeAnonymous: () =>
      `👋 *Karibu Limuru Cottage Hospital!*\n\n` +
      `Mimi ni msaidizi wako wa kidijitali. Naweza kukusaidia:\n` +
      `• Jisajili kwenye foleni\n` +
      `• Angalia nafasi yako kwenye foleni\n` +
      `• Pata muda wa kusubiri\n\n` +
      `Nikusaidie vipi leo?`,
    askName: () =>
      `📝 *Usajili wa Mgonjwa Mpya*\n\n` +
      `Hebu tusajiliwe. Kwanza, jina lako ni nani?`,
    askPhone: () =>
      `📱 Sawa! Nambari yako ya simu ni nini? (k.m., +254712345678)\n\n` +
      `Tutaitumia kukutumia taarifa za foleni.`,
    askDepartment: () =>
      `🏥 Unahitaji wodi gani?\n\n` +
      `Tafadhali chagua moja:`,
    confirmBooking: (name: string, department: string) =>
      `✅ *Kidhibitisho cha Booking*\n\n` +
      `Jina: ${name}\n` +
      `Wodi: ${department}\n\n` +
      `Hii ni sahihi?`,
    bookingConfirmed: (ticketNumber: string, position: string, waitTime: string) =>
      `🎫 *Ukujiandikisha umefanikiwa!*\n\n` +
      `Nambari ya Tiketi: *${ticketNumber}*\n` +
      `Nafasi Yako: *${position}*\n` +
      `Muda wa Kusubiri: *${waitTime}*\n\n` +
      `Tutakuarifu inapokuwa wakati wako.\n\n` +
      `Ungependa kupokea arifa za SMS?`,
    positionCheck: (ticketNumber: string, position: string, waitTime: string, status: string) =>
      `📊 *Hali ya Foleni kwa ${ticketNumber}*\n\n` +
      `Nafasi Yako: *#${position}*\n` +
      `Muda wa Kusubiri: *${waitTime}*\n` +
      `Hali: *${status}*\n\n` +
      `Tutakuarifu unapokaribia kuitwa.`,
    help: () =>
      `ℹ️ *Amri Zinazopatikana:*\n\n` +
      `• *SAJILI* - Anza usajili wa mgonjwa\n` +
      `• *HALI* - Angalia nafasi yako kwenye foleni\n` +
      `• *GHAFI* - Ghairi booking yako\n` +
      `• *USAIDIZI* - Onyesha ujumbe huu\n\n` +
      `Au niandike swali lako na nitakusaidia!`,
    cancelConfirm: () =>
      `❌ Una uhakika unataka kughairi booking yako?\n\n` +
      `Hii haiwezi kufutwa.`,
    cancelled: () =>
      `🗑️ Booking yako imeghairiwa.\n\n` +
      `Ikiwa unahitaji kujisajili tena, tuma *SAJILI*.`,
    invalidOption: () =>
      `❓ Sina uhakika nimeelewa.\n\n` +
      `Tafadhali chagua moja ya chaguzi hapa chini au tuma *USAIDIZI* kwa usaidizi.`,
    thankYou: () =>
      `🙏 Asante kwa kutumia Limuru Cottage Hospital!\n\n` +
      `Jiangalie na tunashukuru kukuona! 🌻`,
    smsReminderConfirm: () =>
      `📱 Ungependa kupokea arifa za SMS unapokuwa karibu kuitwa?`,
    smsEnabled: () =>
      `✅ Arifa za SMS zimewezeshwa!\n\n` +
      `Tutakutumia ujumbe wa text unapokuwa karibu na wagonjwa 3 kuitwa.`,
    error: () =>
      `⚠️ Kuna kitu kilichokosekana. Tafadhali jaribu tena au tuma *USAIDIZI* kwa usaidizi.`,
  },
};

export const DEPARTMENTS = [
  { code: 'MED', name: 'General Medicine', nameSw: 'Dawa za Kawaida' },
  { code: 'PED', name: 'Pediatrics', nameSw: 'Watoto' },
  { code: 'EMR', name: 'Emergency', nameSw: 'Dharura' },
  { code: 'GYN', name: 'Gynecology', nameSw: 'Wanawake' },
  { code: 'ORT', name: 'Orthopedics', nameSw: 'Mifupa' },
  { code: 'DEN', name: 'Dental', nameSw: 'Meno' },
  { code: 'LAB', name: 'Laboratory', nameSw: 'Maabara' },
  { code: 'CAR', name: 'Cardiology', nameSw: 'Moyo' },
  { code: 'RAD', name: 'Radiology', nameSw: 'Miondoko' },
];

export class WhatsAppChatbot {
  private sessions: Map<string, WhatsAppUserSession> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Sessions will be loaded from KV in production
  }

  private getMsg(phone: string, key: keyof typeof MESSAGES.en, ...args: string[]): string {
    const session = this.sessions.get(phone);
    const lang = session?.language || 'en';
    const msgFn = MESSAGES[lang][key] as (...args: string[]) => string;
    return msgFn(...args);
  }

  private detectLanguage(message: string): 'en' | 'sw' {
    const swahiliWords = ['asante', 'karibu', 'habari', 'ndiyo', 'hapana', 'sawa', 'moja', 'mbili', 'tatu', 'usajili', 'foleni', 'hodi', 'tafadhali'];
    const lower = message.toLowerCase();
    let swahiliScore = 0;
    for (const word of swahiliWords) {
      if (lower.includes(word)) swahiliScore++;
    }
    return swahiliScore >= 2 ? 'sw' : 'en';
  }

  createSession(phone: string): WhatsAppUserSession {
    const session: WhatsAppUserSession = {
      phone,
      state: 'idle',
      data: {},
      language: 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
    };
    this.sessions.set(phone, session);
    return session;
  }

  getSession(phone: string): WhatsAppUserSession | undefined {
    return this.sessions.get(phone);
  }

  processMessage(phone: string, message: string): ChatbotResponse {
    let session = this.sessions.get(phone);
    const lang = session?.language || this.detectLanguage(message);
    const normalizedMessage = message.trim();
    const upper = normalizedMessage.toUpperCase();

    if (upper === 'HELP' || upper === 'USAIDIZI') {
      return { messages: [{ to: phone, type: 'text', text: MESSAGES[lang].help() }] };
    }

    if (upper === 'CANCEL' || upper === 'GHAFI') {
      if (session) {
        session.state = 'complete';
        return { messages: [{ to: phone, type: 'text', text: MESSAGES[lang].cancelled() }], session };
      }
      return { messages: [{ to: phone, type: 'text', text: MESSAGES[lang].invalidOption() }] };
    }

    if (upper === 'REGISTER' || upper === 'SAJILI') {
      if (!session) session = this.createSession(phone);
      session.language = lang;
      session.state = 'awaiting_name';
      session.data = {};
      return { 
        messages: [{ to: phone, type: 'text', text: MESSAGES[lang].askName() }],
        newState: 'awaiting_name',
        session
      };
    }

    if (upper === 'STATUS' || upper === 'HALI') {
      return { 
        messages: [{ 
          to: phone, type: 'text', 
          text: `📊 *Check Your Status*\n\nTo check your queue position, please provide your ticket number or phone number.\n\nOr reply *HELP* for available commands.` 
        }] 
      };
    }

    if (!session) {
      session = this.createSession(phone);
      session.language = lang;
      return { 
        messages: [{ to: phone, type: 'text', text: MESSAGES[lang].welcomeAnonymous() }],
        session
      };
    }

    session.messageCount++;
    session.updatedAt = new Date().toISOString();

    switch (session.state) {
      case 'idle':
        return this.handleIdle(phone, session, normalizedMessage, lang);
      case 'awaiting_name':
        return this.handleNameInput(phone, session, normalizedMessage, lang);
      case 'awaiting_phone':
        return this.handlePhoneInput(phone, session, normalizedMessage, lang);
      case 'awaiting_department':
        return this.handleDepartmentSelect(phone, session, normalizedMessage, lang);
      case 'awaiting_yes_no':
        return this.handleYesNo(phone, session, normalizedMessage, lang);
      default:
        return { 
          messages: [{ to: phone, type: 'text', text: MESSAGES[lang].invalidOption() }],
          session
        };
    }
  }

  private handleIdle(phone: string, session: WhatsAppUserSession, message: string, lang: 'en' | 'sw'): ChatbotResponse {
    const upper = message.toUpperCase();
    if (upper === 'REGISTER' || upper === 'SAJILI') {
      session.state = 'awaiting_name';
      session.data = {};
      return { 
        messages: [{ to: phone, type: 'text', text: MESSAGES[lang].askName() }],
        newState: 'awaiting_name',
        session
      };
    }
    if (upper === 'STATUS' || upper === 'HALI') {
      return { 
        messages: [{ to: phone, type: 'text', text: MESSAGES[lang].welcomeAnonymous() }],
        session
      };
    }
    return { 
      messages: [{ to: phone, type: 'text', text: MESSAGES[lang].welcomeAnonymous() }],
      session
    };
  }

  private handleNameInput(phone: string, session: WhatsAppUserSession, name: string, lang: 'en' | 'sw'): ChatbotResponse {
    if (name.length < 2 || name.length > 100) {
      return { 
        messages: [{ to: phone, type: 'text', text: MESSAGES[lang].invalidOption() }],
        session
      };
    }
    const parts = name.trim().split(/\s+/);
    session.data.firstName = parts[0];
    session.data.lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
    session.data.fullName = name.trim();
    session.state = 'awaiting_phone';
    return {
      messages: [{ to: phone, type: 'text', text: MESSAGES[lang].askPhone() }],
      newState: 'awaiting_phone',
      session
    };
  }

  private handlePhoneInput(phone: string, session: WhatsAppUserSession, phoneInput: string, lang: 'en' | 'sw'): ChatbotResponse {
    const cleanPhone = phoneInput.replace(/[\s\-()]/g, '');
    const phoneRegex = /^(\+?254|0)[71]\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return { 
        messages: [{ to: phone, type: 'text', text: MESSAGES[lang].invalidOption() }],
        session
      };
    }
    if (cleanPhone.startsWith('0')) {
      session.data.phone = '+254' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('254')) {
      session.data.phone = '+' + cleanPhone;
    } else {
      session.data.phone = cleanPhone;
    }
    session.state = 'awaiting_department';
    return {
      messages: this.buildDepartmentList(phone, lang),
      newState: 'awaiting_department',
      session
    };
  }

  private handleDepartmentSelect(phone: string, session: WhatsAppUserSession, selection: string, lang: 'en' | 'sw'): ChatbotResponse {
    const upper = selection.toUpperCase();
    const dept = DEPARTMENTS.find(d => 
      d.code === upper || 
      d.name.toUpperCase() === upper ||
      d.nameSw.toUpperCase() === upper
    );
    if (!dept) {
      return {
        messages: this.buildDepartmentList(phone, lang),
        session
      };
    }
    session.data.department = dept.code;
    session.state = 'awaiting_yes_no';
    session.data.lastYesNoContext = 'confirm_booking';
    const deptName = lang === 'sw' ? dept.nameSw : dept.name;
    return {
      messages: [{ to: phone, type: 'text', text: MESSAGES[lang].confirmBooking(session.data.fullName!, deptName) }],
      newState: 'awaiting_yes_no',
      session
    };
  }

  private handleYesNo(phone: string, session: WhatsAppUserSession, response: string, lang: 'en' | 'sw'): ChatbotResponse {
    const upper = response.toUpperCase();
    const isYes = upper === 'YES' || upper === 'Y' || upper === 'NDIYO' || upper === 'N' || upper === 'SAWA';
    const isNo = upper === 'NO' || upper === 'HAPANA';
    const context = session.data.lastYesNoContext;

    if (isNo) {
      session.state = 'complete';
      return { 
        messages: [{ to: phone, type: 'text', text: MESSAGES[lang].cancelled() }],
        session
      };
    }

    if (!isYes) {
      return { 
        messages: [{ to: phone, type: 'text', text: MESSAGES[lang].invalidOption() }],
        session
      };
    }

    if (context === 'confirm_booking') {
      const ticketNumber = `${session.data.department}/R---/${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
      const position = String(Math.floor(Math.random() * 10) + 1);
      const waitTime = `${parseInt(position) * 8} minutes`;
      session.data.ticketNumber = ticketNumber;
      session.data.queuePosition = parseInt(position);
      session.data.estimatedWait = parseInt(position) * 8;
      session.state = 'awaiting_yes_no';
      session.data.lastYesNoContext = 'sms_reminder';
      return {
        messages: [
          { to: phone, type: 'text', text: MESSAGES[lang].bookingConfirmed(ticketNumber, position, waitTime) },
          { to: phone, type: 'text', text: MESSAGES[lang].smsReminderConfirm() },
        ],
        session
      };
    }

    if (context === 'sms_reminder') {
      session.state = 'complete';
      const msg = isYes ? MESSAGES[lang].smsEnabled() : MESSAGES[lang].thankYou();
      return { 
        messages: [{ to: phone, type: 'text', text: msg }],
        session
      };
    }

    session.state = 'complete';
    return { 
      messages: [{ to: phone, type: 'text', text: MESSAGES[lang].thankYou() }],
      session
    };
  }

  private buildDepartmentList(phone: string, lang: 'en' | 'sw'): WhatsAppOutgoingMessage[] {
    const rows = DEPARTMENTS.map(d => ({
      id: d.code,
      title: lang === 'sw' ? `${d.code} - ${d.nameSw}` : `${d.code} - ${d.name}`,
    }));
    const askDept = MESSAGES[lang].askDepartment();
    return [{
      to: phone,
      type: 'interactive',
      body: askDept,
      footer: 'Limuru Cottage Hospital',
      sections: [{
        title: lang === 'sw' ? 'Wodi' : 'Departments',
        rows,
      }],
    }];
  }

  cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [phone, session] of this.sessions.entries()) {
      const lastActivity = new Date(session.updatedAt).getTime();
      if (now - lastActivity > this.SESSION_TIMEOUT) {
        this.sessions.delete(phone);
        cleaned++;
      }
    }
    return cleaned;
  }

  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  // Load sessions from KV (for production)
  async loadFromKV(kv: KVNamespace): Promise<void> {
    const list = await kv.list({ prefix: 'wa_session:' });
    for (const key of list.keys) {
      const data = await kv.get(key.name);
      if (data) {
        const session = JSON.parse(data) as WhatsAppUserSession;
        this.sessions.set(session.phone, session);
      }
    }
  }

  // Save sessions to KV (for production)
  async saveToKV(kv: KVNamespace): Promise<void> {
    for (const [phone, session] of this.sessions.entries()) {
      await kv.put(`wa_session:${phone}`, JSON.stringify(session), {
        expirationTtl: 86400, // 24 hours
      });
    }
  }
}

export const chatbot = new WhatsAppChatbot();
