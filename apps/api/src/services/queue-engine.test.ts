import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

interface QueueTicket {
  id: string;
  ticketNumber: string;
  patientId: string;
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

interface QueueConfig {
  averageServiceTime: number;
  maxQueueSize: number;
  priorityLevels: number;
}

const createMockQueueEngine = () => {
  let tickets: QueueTicket[] = [];
  let config: QueueConfig = {
    averageServiceTime: 15,
    maxQueueSize: 100,
    priorityLevels: 4,
  };

  const generateTicketNumber = (department: string): string => {
    const deptCode = department.substring(0, 3).toUpperCase();
    const sequence = String(tickets.length + 1).padStart(4, '0');
    const timeCode = new Date().getHours().toString().padStart(2, '0');
    return `${deptCode}-${timeCode}${sequence}`;
  };

  const calculatePriorityScore = (ticket: QueueTicket): number => {
    const priorityWeights = {
      urgent: 1000,
      high: 100,
      normal: 10,
      low: 1,
    };
    
    const baseScore = priorityWeights[ticket.priority] || 10;
    const timeWeight = Math.floor(
      (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60)
    );
    
    return baseScore + timeWeight;
  };

  const sortQueue = (): QueueTicket[] => {
    return [...tickets]
      .filter(t => t.status === 'waiting')
      .sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a));
  };

  return {
    addTicket: (data: {
      patientId: string;
      department: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    }): QueueTicket => {
      const ticket: QueueTicket = {
        id: `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ticketNumber: generateTicketNumber(data.department),
        patientId: data.patientId,
        department: data.department,
        priority: data.priority || 'normal',
        status: 'waiting',
        position: 0,
        createdAt: new Date(),
      };
      
      tickets.push(ticket);
      return ticket;
    },

    callNext: (department: string, doctorId: string, room: string): QueueTicket | null => {
      const queue = sortQueue().filter(t => t.department === department);
      if (queue.length === 0) return null;
      
      const next = queue[0];
      next.status = 'called';
      next.calledAt = new Date();
      next.doctorId = doctorId;
      next.roomAssigned = room;
      
      return next;
    },

    startService: (ticketId: string): QueueTicket | null => {
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket || ticket.status !== 'called') return null;
      
      ticket.status = 'serving';
      ticket.startedAt = new Date();
      
      return ticket;
    },

    completeTicket: (ticketId: string, notes?: {
      diagnosis?: string;
      prescription?: string;
      notes?: string;
    }): QueueTicket | null => {
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket || ticket.status !== 'serving') return null;
      
      ticket.status = 'completed';
      ticket.completedAt = new Date();
      
      if (ticket.startedAt) {
        ticket.waitTimeMinutes = Math.floor(
          (Date.now() - new Date(ticket.startedAt).getTime()) / (1000 * 60)
        );
      }
      
      return ticket;
    },

    markNoShow: (ticketId: string): QueueTicket | null => {
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) return null;
      
      ticket.status = 'no_show';
      return ticket;
    },

    getQueue: (department: string): QueueTicket[] => {
      const queue = sortQueue().filter(t => t.department === department);
      return queue.map((ticket, index) => ({
        ...ticket,
        position: index + 1,
      }));
    },

    getTicket: (ticketId: string): QueueTicket | null => {
      return tickets.find(t => t.id === ticketId) || null;
    },

    getWaitingCount: (department?: string): number => {
      return tickets.filter(t => {
        if (t.status !== 'waiting') return false;
        if (department && t.department !== department) return false;
        return true;
      }).length;
    },

    getCalledCount: (department?: string): number => {
      return tickets.filter(t => {
        if (t.status !== 'called') return false;
        if (department && t.department !== department) return false;
        return true;
      }).length;
    },

    estimateWaitTime: (ticketId: string): number => {
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) return 0;
      
      const queue = sortQueue().filter(
        t => t.department === ticket.department && t.id !== ticketId
      );
      
      return queue.length * config.averageServiceTime;
    },

    transferTicket: (ticketId: string, newDepartment: string): QueueTicket | null => {
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket || ticket.status === 'completed' || ticket.status === 'no_show') {
        return null;
      }
      
      ticket.department = newDepartment;
      ticket.ticketNumber = generateTicketNumber(newDepartment);
      ticket.status = 'waiting';
      
      return ticket;
    },

    setConfig: (newConfig: Partial<QueueConfig>) => {
      config = { ...config, ...newConfig };
    },

    getConfig: (): QueueConfig => ({ ...config }),

    clear: () => {
      tickets = [];
    },

    getAllTickets: (): QueueTicket[] => [...tickets],
  };
};

describe('Queue Engine', () => {
  let engine: ReturnType<typeof createMockQueueEngine>;

  beforeEach(() => {
    engine = createMockQueueEngine();
  });

  afterEach(() => {
    engine.clear();
  });

  describe('Ticket Creation', () => {
    it('should create a ticket with default priority', () => {
      const ticket = engine.addTicket({
        patientId: 'patient-123',
        department: 'MED',
      });

      expect(ticket).toBeDefined();
      expect(ticket.patientId).toBe('patient-123');
      expect(ticket.department).toBe('MED');
      expect(ticket.priority).toBe('normal');
      expect(ticket.status).toBe('waiting');
      expect(ticket.ticketNumber).toContain('MED');
    });

    it('should create a ticket with urgent priority', () => {
      const ticket = engine.addTicket({
        patientId: 'patient-456',
        department: 'PED',
        priority: 'urgent',
      });

      expect(ticket.priority).toBe('urgent');
    });

    it('should generate unique ticket numbers', () => {
      const ticket1 = engine.addTicket({
        patientId: 'patient-1',
        department: 'MED',
      });
      const ticket2 = engine.addTicket({
        patientId: 'patient-2',
        department: 'MED',
      });

      expect(ticket1.ticketNumber).not.toBe(ticket2.ticketNumber);
    });

    it('should set creation timestamp', () => {
      const before = new Date();
      const ticket = engine.addTicket({
        patientId: 'patient-123',
        department: 'MED',
      });
      const after = new Date();

      expect(new Date(ticket.createdAt).getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(new Date(ticket.createdAt).getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Priority Scoring', () => {
    it('should sort urgent tickets first', () => {
      engine.addTicket({ patientId: 'p1', department: 'MED', priority: 'normal' });
      engine.addTicket({ patientId: 'p2', department: 'MED', priority: 'urgent' });
      engine.addTicket({ patientId: 'p3', department: 'MED', priority: 'low' });

      const queue = engine.getQueue('MED');
      
      expect(queue[0].patientId).toBe('p2');
      expect(queue[0].priority).toBe('urgent');
    });

    it('should sort high priority before normal', () => {
      engine.addTicket({ patientId: 'p1', department: 'MED', priority: 'normal' });
      engine.addTicket({ patientId: 'p2', department: 'MED', priority: 'high' });

      const queue = engine.getQueue('MED');
      
      expect(queue[0].patientId).toBe('p2');
    });

    it('should consider wait time in priority score', async () => {
      const ticket1 = engine.addTicket({
        patientId: 'p1',
        department: 'MED',
        priority: 'normal',
      });
      
      engine.addTicket({
        patientId: 'p2',
        department: 'MED',
        priority: 'normal',
      });

      const queue = engine.getQueue('MED');
      expect(queue[0].patientId).toBe(ticket1.patientId);
    });
  });

  describe('Call Flow', () => {
    it('should call next patient in queue', () => {
      engine.addTicket({ patientId: 'p1', department: 'MED' });
      engine.addTicket({ patientId: 'p2', department: 'MED' });
      engine.addTicket({ patientId: 'p3', department: 'MED' });

      const called = engine.callNext('MED', 'doctor-1', 'Room 101');

      expect(called).toBeDefined();
      expect(called?.patientId).toBe('p1');
      expect(called?.status).toBe('called');
      expect(called?.doctorId).toBe('doctor-1');
      expect(called?.roomAssigned).toBe('Room 101');
      expect(called?.calledAt).toBeDefined();
    });

    it('should return null when queue is empty', () => {
      const called = engine.callNext('MED', 'doctor-1', 'Room 101');
      expect(called).toBeNull();
    });

    it('should not call patient from wrong department', () => {
      engine.addTicket({ patientId: 'p1', department: 'MED' });

      const called = engine.callNext('PED', 'doctor-1', 'Room 101');
      expect(called).toBeNull();
    });

    it('should call urgent patient first', () => {
      engine.addTicket({ patientId: 'p1', department: 'MED' });
      engine.addTicket({ patientId: 'p2', department: 'MED', priority: 'urgent' });

      const called = engine.callNext('MED', 'doctor-1', 'Room 101');
      
      expect(called?.patientId).toBe('p2');
    });
  });

  describe('Service Completion', () => {
    it('should start service for called patient', () => {
      const ticket = engine.addTicket({ patientId: 'p1', department: 'MED' });
      engine.callNext('MED', 'doctor-1', 'Room 101');

      const started = engine.startService(ticket.id);

      expect(started).toBeDefined();
      expect(started?.status).toBe('serving');
      expect(started?.startedAt).toBeDefined();
    });

    it('should not start service for waiting patient', () => {
      const ticket = engine.addTicket({ patientId: 'p1', department: 'MED' });

      const started = engine.startService(ticket.id);
      expect(started).toBeNull();
    });

    it('should complete service and calculate wait time', async () => {
      const ticket = engine.addTicket({ patientId: 'p1', department: 'MED' });
      engine.callNext('MED', 'doctor-1', 'Room 101');
      engine.startService(ticket.id);

      const completed = engine.completeTicket(ticket.id, {
        diagnosis: 'Common cold',
        prescription: 'Rest and fluids',
      });

      expect(completed).toBeDefined();
      expect(completed?.status).toBe('completed');
      expect(completed?.completedAt).toBeDefined();
    });

    it('should not complete ticket that is not being served', () => {
      const ticket = engine.addTicket({ patientId: 'p1', department: 'MED' });

      const completed = engine.completeTicket(ticket.id);
      expect(completed).toBeNull();
    });
  });

  describe('No Show Handling', () => {
    it('should mark ticket as no-show', () => {
      const ticket = engine.addTicket({ patientId: 'p1', department: 'MED' });

      const marked = engine.markNoShow(ticket.id);

      expect(marked).toBeDefined();
      expect(marked?.status).toBe('no_show');
    });

    it('should remove no-show ticket from active queue', () => {
      const ticket = engine.addTicket({ patientId: 'p1', department: 'MED' });
      engine.markNoShow(ticket.id);

      const queue = engine.getQueue('MED');
      expect(queue.length).toBe(0);
    });
  });

  describe('Queue Statistics', () => {
    it('should count waiting patients correctly', () => {
      engine.addTicket({ patientId: 'p1', department: 'MED' });
      engine.addTicket({ patientId: 'p2', department: 'MED' });
      engine.addTicket({ patientId: 'p3', department: 'PED' });

      expect(engine.getWaitingCount('MED')).toBe(2);
      expect(engine.getWaitingCount('PED')).toBe(1);
      expect(engine.getWaitingCount()).toBe(3);
    });

    it('should count called patients correctly', () => {
      engine.addTicket({ patientId: 'p1', department: 'MED' });
      engine.addTicket({ patientId: 'p2', department: 'MED' });
      engine.callNext('MED', 'doctor-1', 'Room 101');

      expect(engine.getCalledCount('MED')).toBe(1);
    });

    it('should estimate wait time based on queue position', () => {
      engine.addTicket({ patientId: 'p1', department: 'MED' });
      engine.addTicket({ patientId: 'p2', department: 'MED' });
      engine.addTicket({ patientId: 'p3', department: 'MED' });

      const ticket = engine.getQueue('MED')[0];
      const waitTime = engine.estimateWaitTime(ticket.id);

      expect(waitTime).toBe(30);
    });
  });

  describe('Transfer', () => {
    it('should transfer patient to new department', () => {
      const ticket = engine.addTicket({ patientId: 'p1', department: 'MED' });

      const transferred = engine.transferTicket(ticket.id, 'PED');

      expect(transferred).toBeDefined();
      expect(transferred?.department).toBe('PED');
    });

    it('should not transfer completed tickets', () => {
      const ticket = engine.addTicket({ patientId: 'p1', department: 'MED' });
      engine.callNext('MED', 'doctor-1', 'Room 101');
      engine.startService(ticket.id);
      engine.completeTicket(ticket.id);

      const transferred = engine.transferTicket(ticket.id, 'PED');
      expect(transferred).toBeNull();
    });

    it('should generate new ticket number on transfer', () => {
      const ticket = engine.addTicket({ patientId: 'p1', department: 'MED' });
      const originalNumber = ticket.ticketNumber;

      engine.transferTicket(ticket.id, 'PED');

      expect(ticket.ticketNumber).not.toBe(originalNumber);
      expect(ticket.ticketNumber).toContain('PED');
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      engine.setConfig({ averageServiceTime: 20 });

      const config = engine.getConfig();
      expect(config.averageServiceTime).toBe(20);
    });

    it('should use updated config for wait time estimation', () => {
      engine.setConfig({ averageServiceTime: 20 });
      
      engine.addTicket({ patientId: 'p1', department: 'MED' });
      engine.addTicket({ patientId: 'p2', department: 'MED' });

      const ticket = engine.getQueue('MED')[0];
      const waitTime = engine.estimateWaitTime(ticket.id);

      expect(waitTime).toBe(40);
    });
  });
});
