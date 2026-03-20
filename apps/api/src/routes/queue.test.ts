import { describe, it, expect, beforeEach } from 'vitest';

interface QueueTicket {
  id: string;
  ticketNumber: string;
  patientId: string;
  patientName: string;
  department: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'waiting' | 'called' | 'serving' | 'completed' | 'no_show';
  position: number;
  createdAt: Date;
  calledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  roomAssigned?: string;
  doctorId?: string;
  waitTimeMinutes?: number;
}

interface CreateQueueEntryRequest {
  patientId: string;
  department: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
}

interface TransferRequest {
  toDepartment: string;
  reason?: string;
}

const createMockQueueAPI = () => {
  const tickets: Map<string, QueueTicket> = new Map();
  let counter = 0;

  const generateTicketNumber = (department: string): string => {
    counter++;
    const date = new Date();
    const dateStr = `${date.getMonth() + 1}${date.getDate()}`;
    return `${department}-${dateStr}-${String(counter).padStart(3, '0')}`;
  };

  const getAllTickets = (): QueueTicket[] => Array.from(tickets.values());

  const getTicketsByDepartment = (department: string): QueueTicket[] => {
    return getAllTickets()
      .filter(t => t.department === department && t.status === 'waiting')
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  };

  const createEntry = (data: CreateQueueEntryRequest): QueueTicket => {
    const id = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ticket: QueueTicket = {
      id,
      ticketNumber: generateTicketNumber(data.department),
      patientId: data.patientId,
      patientName: `Patient ${data.patientId}`,
      department: data.department,
      priority: data.priority || 'normal',
      status: 'waiting',
      position: 0,
      createdAt: new Date(),
    };

    tickets.set(id, ticket);
    return ticket;
  };

  const createFastEntry = (data: { patientId: string; department: string; reason: string }): QueueTicket => {
    return createEntry({
      ...data,
      priority: 'normal',
    });
  };

  const callPatient = (ticketId: string, doctorId?: string, room?: string): QueueTicket | null => {
    const ticket = tickets.get(ticketId);
    if (!ticket || ticket.status !== 'waiting') return null;

    ticket.status = 'called';
    ticket.calledAt = new Date();
    if (doctorId) ticket.doctorId = doctorId;
    if (room) ticket.roomAssigned = room;

    tickets.set(ticketId, ticket);
    return ticket;
  };

  const startConsultation = (ticketId: string): QueueTicket | null => {
    const ticket = tickets.get(ticketId);
    if (!ticket || ticket.status !== 'called') return null;

    ticket.status = 'serving';
    ticket.startedAt = new Date();

    tickets.set(ticketId, ticket);
    return ticket;
  };

  const completeConsultation = (ticketId: string): QueueTicket | null => {
    const ticket = tickets.get(ticketId);
    if (!ticket || ticket.status !== 'serving') return null;

    ticket.status = 'completed';
    ticket.completedAt = new Date();

    if (ticket.startedAt) {
      ticket.waitTimeMinutes = Math.floor(
        (Date.now() - new Date(ticket.startedAt).getTime()) / (1000 * 60)
      );
    }

    tickets.set(ticketId, ticket);
    return ticket;
  };

  const markNoShow = (ticketId: string): QueueTicket | null => {
    const ticket = tickets.get(ticketId);
    if (!ticket) return null;

    ticket.status = 'no_show';

    tickets.set(ticketId, ticket);
    return ticket;
  };

  const transferPatient = (ticketId: string, data: TransferRequest): QueueTicket | null => {
    const ticket = tickets.get(ticketId);
    if (!ticket || ticket.status === 'completed' || ticket.status === 'no_show') {
      return null;
    }

    ticket.department = data.toDepartment;
    ticket.ticketNumber = generateTicketNumber(data.toDepartment);
    ticket.status = 'waiting';

    tickets.set(ticketId, ticket);
    return ticket;
  };

  const getQueueSummary = (): { department: string; waiting: number; called: number }[] => {
    const departments = ['MED', 'PED', 'GYN', 'OPH', 'DEN', 'ORTH'];
    return departments.map(dept => {
      const deptTickets = getAllTickets().filter(t => t.department === dept);
      return {
        department: dept,
        waiting: deptTickets.filter(t => t.status === 'waiting').length,
        called: deptTickets.filter(t => t.status === 'called' || t.status === 'serving').length,
      };
    });
  };

  return {
    createEntry,
    createFastEntry,
    callPatient,
    startConsultation,
    completeConsultation,
    markNoShow,
    transferPatient,
    getTicketsByDepartment,
    getAllTickets,
    getQueueSummary,
    clear: () => tickets.clear(),
  };
};

describe('Queue Routes', () => {
  let queueAPI: ReturnType<typeof createMockQueueAPI>;

  beforeEach(() => {
    queueAPI = createMockQueueAPI();
  });

  describe('Create Queue Entry', () => {
    it('should create queue entry with default priority', async () => {
      const entry = queueAPI.createEntry({
        patientId: 'patient-123',
        department: 'MED',
      });

      expect(entry.ticketNumber).toContain('MED');
      expect(entry.status).toBe('waiting');
      expect(entry.priority).toBe('normal');
    });

    it('should create queue entry with urgent priority', async () => {
      const entry = queueAPI.createEntry({
        patientId: 'patient-456',
        department: 'PED',
        priority: 'urgent',
      });

      expect(entry.priority).toBe('urgent');
    });

    it('should generate unique ticket numbers', async () => {
      const entry1 = queueAPI.createEntry({ patientId: 'p1', department: 'MED' });
      const entry2 = queueAPI.createEntry({ patientId: 'p2', department: 'MED' });

      expect(entry1.ticketNumber).not.toBe(entry2.ticketNumber);
    });
  });

  describe('Fast Queue Entry', () => {
    it('should create fast queue entry', async () => {
      const entry = queueAPI.createFastEntry({
        patientId: 'patient-fast',
        department: 'MED',
        reason: 'Follow-up visit',
      });

      expect(entry.status).toBe('waiting');
      expect(entry.priority).toBe('normal');
    });
  });

  describe('Get Queue by Department', () => {
    it('should return queue for specific department', async () => {
      queueAPI.createEntry({ patientId: 'p1', department: 'MED' });
      queueAPI.createEntry({ patientId: 'p2', department: 'MED' });
      queueAPI.createEntry({ patientId: 'p3', department: 'PED' });

      const queue = queueAPI.getTicketsByDepartment('MED');

      expect(queue.length).toBe(2);
      queue.forEach(ticket => {
        expect(ticket.department).toBe('MED');
      });
    });

    it('should sort by priority (urgent first)', async () => {
      queueAPI.createEntry({ patientId: 'p1', department: 'MED', priority: 'normal' });
      queueAPI.createEntry({ patientId: 'p2', department: 'MED', priority: 'urgent' });
      queueAPI.createEntry({ patientId: 'p3', department: 'MED', priority: 'low' });

      const queue = queueAPI.getTicketsByDepartment('MED');

      expect(queue[0].patientId).toBe('p2');
      expect(queue[1].patientId).toBe('p1');
      expect(queue[2].patientId).toBe('p3');
    });

    it('should return empty array for empty department', async () => {
      const queue = queueAPI.getTicketsByDepartment('DEN');
      expect(queue.length).toBe(0);
    });
  });

  describe('Call Patient', () => {
    it('should call waiting patient', async () => {
      const entry = queueAPI.createEntry({ patientId: 'p1', department: 'MED' });

      const called = queueAPI.callPatient(entry.id, 'doctor-1', 'Room 101');

      expect(called?.status).toBe('called');
      expect(called?.doctorId).toBe('doctor-1');
      expect(called?.roomAssigned).toBe('Room 101');
      expect(called?.calledAt).toBeDefined();
    });

    it('should fail to call already called patient', async () => {
      const entry = queueAPI.createEntry({ patientId: 'p1', department: 'MED' });
      queueAPI.callPatient(entry.id);

      const secondCall = queueAPI.callPatient(entry.id);
      expect(secondCall).toBeNull();
    });

    it('should fail to call completed patient', async () => {
      const entry = queueAPI.createEntry({ patientId: 'p1', department: 'MED' });
      queueAPI.callPatient(entry.id);
      queueAPI.startConsultation(entry.id);
      queueAPI.completeConsultation(entry.id);

      const call = queueAPI.callPatient(entry.id);
      expect(call).toBeNull();
    });
  });

  describe('Start Consultation', () => {
    it('should start consultation for called patient', async () => {
      const entry = queueAPI.createEntry({ patientId: 'p1', department: 'MED' });
      queueAPI.callPatient(entry.id);

      const started = queueAPI.startConsultation(entry.id);

      expect(started?.status).toBe('serving');
      expect(started?.startedAt).toBeDefined();
    });

    it('should not start for waiting patient', async () => {
      const entry = queueAPI.createEntry({ patientId: 'p1', department: 'MED' });

      const started = queueAPI.startConsultation(entry.id);
      expect(started).toBeNull();
    });
  });

  describe('Complete Consultation', () => {
    it('should complete consultation and calculate wait time', async () => {
      const entry = queueAPI.createEntry({ patientId: 'p1', department: 'MED' });
      queueAPI.callPatient(entry.id);
      queueAPI.startConsultation(entry.id);

      const completed = queueAPI.completeConsultation(entry.id);

      expect(completed?.status).toBe('completed');
      expect(completed?.completedAt).toBeDefined();
      expect(typeof completed?.waitTimeMinutes).toBe('number');
    });

    it('should not complete for called patient', async () => {
      const entry = queueAPI.createEntry({ patientId: 'p1', department: 'MED' });
      queueAPI.callPatient(entry.id);

      const completed = queueAPI.completeConsultation(entry.id);
      expect(completed).toBeNull();
    });
  });

  describe('No Show', () => {
    it('should mark patient as no-show', async () => {
      const entry = queueAPI.createEntry({ patientId: 'p1', department: 'MED' });

      const noShow = queueAPI.markNoShow(entry.id);

      expect(noShow?.status).toBe('no_show');
    });

    it('should not appear in queue after no-show', async () => {
      const entry = queueAPI.createEntry({ patientId: 'p1', department: 'MED' });
      queueAPI.markNoShow(entry.id);

      const queue = queueAPI.getTicketsByDepartment('MED');
      expect(queue.length).toBe(0);
    });
  });

  describe('Transfer Patient', () => {
    it('should transfer patient to new department', async () => {
      const entry = queueAPI.createEntry({ patientId: 'p1', department: 'MED' });

      const transferred = queueAPI.transferPatient(entry.id, {
        toDepartment: 'PED',
        reason: 'Specialist referral',
      });

      expect(transferred?.department).toBe('PED');
      expect(transferred?.ticketNumber).toContain('PED');
    });

    it('should not transfer completed patient', async () => {
      const entry = queueAPI.createEntry({ patientId: 'p1', department: 'MED' });
      queueAPI.callPatient(entry.id);
      queueAPI.startConsultation(entry.id);
      queueAPI.completeConsultation(entry.id);

      const transferred = queueAPI.transferPatient(entry.id, { toDepartment: 'PED' });
      expect(transferred).toBeNull();
    });
  });

  describe('Queue Summary', () => {
    it('should return summary for all departments', async () => {
      queueAPI.createEntry({ patientId: 'p1', department: 'MED' });
      queueAPI.createEntry({ patientId: 'p2', department: 'MED' });
      queueAPI.createEntry({ patientId: 'p3', department: 'PED' });
      queueAPI.callPatient(queueAPI.getTicketsByDepartment('MED')[0].id);

      const summary = queueAPI.getQueueSummary();

      expect(summary.length).toBeGreaterThan(0);
      
      const medSummary = summary.find(s => s.department === 'MED');
      expect(medSummary?.waiting).toBe(1);
      expect(medSummary?.called).toBe(1);

      const pedSummary = summary.find(s => s.department === 'PED');
      expect(pedSummary?.waiting).toBe(1);
    });
  });
});
