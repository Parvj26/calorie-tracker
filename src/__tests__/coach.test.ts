import { describe, it, expect, beforeEach } from 'vitest';

// ============================================
// COACH FEATURE TESTS
// ============================================

interface Coach {
  id: string;
  email: string;
  coachCode: string;
  isCoach: true;
}

interface Client {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  currentWeight?: number;
  goalWeight?: number;
  lastActiveDate?: string;
}

interface CoachClientConnection {
  id: string;
  coachId: string;
  clientId: string;
  status: 'pending' | 'connected' | 'rejected' | 'disconnected';
  requestedAt: string;
  connectedAt?: string;
}

describe('Coach Features', () => {
  let coach: Coach;
  let clients: Client[];
  let connections: CoachClientConnection[];

  beforeEach(() => {
    coach = {
      id: 'coach-1',
      email: 'coach@example.com',
      coachCode: 'ABC123',
      isCoach: true,
    };

    clients = [
      {
        id: 'client-1',
        email: 'client1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        currentWeight: 85,
        goalWeight: 75,
        lastActiveDate: '2024-01-15',
      },
      {
        id: 'client-2',
        email: 'client2@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        currentWeight: 70,
        goalWeight: 65,
        lastActiveDate: '2024-01-10',
      },
      {
        id: 'client-3',
        email: 'client3@example.com',
        firstName: 'Bob',
        lastName: 'Wilson',
        lastActiveDate: '2024-01-01', // Inactive
      },
    ];

    connections = [
      {
        id: 'conn-1',
        coachId: 'coach-1',
        clientId: 'client-1',
        status: 'connected',
        requestedAt: '2024-01-01T10:00:00Z',
        connectedAt: '2024-01-01T12:00:00Z',
      },
      {
        id: 'conn-2',
        coachId: 'coach-1',
        clientId: 'client-2',
        status: 'pending',
        requestedAt: '2024-01-14T10:00:00Z',
      },
      {
        id: 'conn-3',
        coachId: 'coach-1',
        clientId: 'client-3',
        status: 'connected',
        requestedAt: '2023-12-01T10:00:00Z',
        connectedAt: '2023-12-01T12:00:00Z',
      },
    ];
  });

  describe('Coach Code Generation', () => {
    const generateCoachCode = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    it('generates 6-character code', () => {
      const code = generateCoachCode();
      expect(code.length).toBe(6);
    });

    it('generates alphanumeric uppercase code', () => {
      const code = generateCoachCode();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('generates unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateCoachCode());
      }
      expect(codes.size).toBeGreaterThan(95);
    });
  });

  describe('Coach Dashboard', () => {
    it('returns connected clients', () => {
      const connected = connections.filter((c) => c.status === 'connected');
      expect(connected).toHaveLength(2);
    });

    it('returns pending requests', () => {
      const pending = connections.filter((c) => c.status === 'pending');
      expect(pending).toHaveLength(1);
    });

    it('identifies inactive clients', () => {
      const INACTIVE_DAYS = 7;
      const today = new Date('2024-01-15');

      const inactiveClients = clients.filter((client) => {
        if (!client.lastActiveDate) return true;
        const lastActive = new Date(client.lastActiveDate);
        const daysSinceActive = Math.floor(
          (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSinceActive > INACTIVE_DAYS;
      });

      // client-3 last active 2024-01-01 = 14 days ago (inactive)
      // client-2 last active 2024-01-10 = 5 days ago (active)
      // client-1 last active 2024-01-15 = 0 days ago (active)
      expect(inactiveClients).toHaveLength(1); // only client-3
    });
  });

  describe('Accept/Reject Requests', () => {
    it('accepts pending request', () => {
      const pendingConn = connections.find((c) => c.status === 'pending')!;

      pendingConn.status = 'connected';
      pendingConn.connectedAt = new Date().toISOString();

      expect(pendingConn.status).toBe('connected');
      expect(pendingConn.connectedAt).toBeDefined();
    });

    it('rejects pending request', () => {
      const pendingConn = connections.find((c) => c.status === 'pending')!;

      pendingConn.status = 'rejected';

      expect(pendingConn.status).toBe('rejected');
    });
  });

  describe('Client Detail View', () => {
    it('returns client profile info', () => {
      const client = clients[0];

      expect(client.firstName).toBe('John');
      expect(client.lastName).toBe('Doe');
      expect(client.currentWeight).toBe(85);
      expect(client.goalWeight).toBe(75);
    });

    it('calculates weight progress', () => {
      const client = clients[0];
      const startWeight = 90; // Assumed
      const progressPercent =
        ((startWeight - client.currentWeight!) / (startWeight - client.goalWeight!)) * 100;

      expect(progressPercent).toBeCloseTo(33.3, 0);
    });
  });

  describe('Client Connection Flow', () => {
    it('looks up coach by code', () => {
      const findCoachByCode = (code: string): Coach | null => {
        if (coach.coachCode === code.toUpperCase()) {
          return coach;
        }
        return null;
      };

      expect(findCoachByCode('ABC123')).toBe(coach);
      expect(findCoachByCode('abc123')).toBe(coach); // Case insensitive
      expect(findCoachByCode('WRONG1')).toBeNull();
    });

    it('creates pending connection request', () => {
      const newConnection: CoachClientConnection = {
        id: `conn-${Date.now()}`,
        coachId: coach.id,
        clientId: 'new-client',
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };

      connections.push(newConnection);

      expect(connections.some((c) => c.clientId === 'new-client')).toBe(true);
    });

    it('prevents duplicate requests', () => {
      const hasPendingRequest = (clientId: string, coachId: string): boolean => {
        return connections.some(
          (c) =>
            c.clientId === clientId &&
            c.coachId === coachId &&
            (c.status === 'pending' || c.status === 'connected')
        );
      };

      expect(hasPendingRequest('client-1', 'coach-1')).toBe(true);
      expect(hasPendingRequest('new-client', 'coach-1')).toBe(false);
    });
  });

  describe('Client Disconnection', () => {
    it('disconnects client from coach', () => {
      const connection = connections.find(
        (c) => c.clientId === 'client-1' && c.status === 'connected'
      )!;

      connection.status = 'disconnected';

      expect(connection.status).toBe('disconnected');
    });

    it('allows reconnection after disconnect', () => {
      // Disconnect
      const connection = connections.find((c) => c.clientId === 'client-1')!;
      connection.status = 'disconnected';

      // Create new request
      const newRequest: CoachClientConnection = {
        id: `conn-${Date.now()}`,
        coachId: coach.id,
        clientId: 'client-1',
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };

      connections.push(newRequest);

      const pending = connections.filter(
        (c) => c.clientId === 'client-1' && c.status === 'pending'
      );
      expect(pending).toHaveLength(1);
    });
  });

  describe('Client Activity Tracking', () => {
    interface ActivitySummary {
      lastActive: string;
      daysActive: number;
      avgCalories: number;
      weightChange: number;
    }

    const getActivitySummary = (
      clientId: string,
      dailyLogs: Array<{ date: string; calories: number }>
    ): ActivitySummary => {
      const daysActive = dailyLogs.length;
      const avgCalories =
        daysActive > 0
          ? Math.round(dailyLogs.reduce((sum, d) => sum + d.calories, 0) / daysActive)
          : 0;

      const lastActive = daysActive > 0 ? dailyLogs[daysActive - 1].date : '';

      return {
        lastActive,
        daysActive,
        avgCalories,
        weightChange: -2.5, // Mock value
      };
    };

    it('calculates activity summary', () => {
      const logs = [
        { date: '2024-01-13', calories: 1800 },
        { date: '2024-01-14', calories: 2000 },
        { date: '2024-01-15', calories: 1900 },
      ];

      const summary = getActivitySummary('client-1', logs);

      expect(summary.daysActive).toBe(3);
      expect(summary.avgCalories).toBe(1900);
    });
  });

  describe('Coach Alerts', () => {
    type AlertType = 'inactive' | 'plateau' | 'goal_reached';

    interface Alert {
      clientId: string;
      type: AlertType;
      message: string;
    }

    const generateAlerts = (
      clients: Client[],
      connections: CoachClientConnection[],
      today: Date
    ): Alert[] => {
      const alerts: Alert[] = [];
      const INACTIVE_THRESHOLD = 7;

      const connectedClientIds = connections
        .filter((c) => c.status === 'connected')
        .map((c) => c.clientId);

      for (const client of clients) {
        if (!connectedClientIds.includes(client.id)) continue;

        // Check for inactivity
        if (client.lastActiveDate) {
          const lastActive = new Date(client.lastActiveDate);
          const daysSince = Math.floor(
            (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSince > INACTIVE_THRESHOLD) {
            alerts.push({
              clientId: client.id,
              type: 'inactive',
              message: `${client.firstName} hasn't logged in ${daysSince} days`,
            });
          }
        }

        // Check for goal reached
        if (client.currentWeight && client.goalWeight) {
          if (client.currentWeight <= client.goalWeight) {
            alerts.push({
              clientId: client.id,
              type: 'goal_reached',
              message: `${client.firstName} has reached their goal weight!`,
            });
          }
        }
      }

      return alerts;
    };

    it('generates inactive alerts', () => {
      const today = new Date('2024-01-15');
      const alerts = generateAlerts(clients, connections, today);

      const inactiveAlerts = alerts.filter((a) => a.type === 'inactive');
      expect(inactiveAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('Client Weight Trend', () => {
    type Trend = 'losing' | 'gaining' | 'maintaining';

    const calculateTrend = (weighIns: Array<{ date: string; weight: number }>): Trend => {
      if (weighIns.length < 2) return 'maintaining';

      const sorted = [...weighIns].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const recent = sorted.slice(-4);
      const firstWeight = recent[0].weight;
      const lastWeight = recent[recent.length - 1].weight;
      const change = lastWeight - firstWeight;

      if (change < -0.5) return 'losing';
      if (change > 0.5) return 'gaining';
      return 'maintaining';
    };

    it('detects weight loss trend', () => {
      const weighIns = [
        { date: '2024-01-01', weight: 85 },
        { date: '2024-01-08', weight: 84 },
        { date: '2024-01-15', weight: 83 },
      ];

      expect(calculateTrend(weighIns)).toBe('losing');
    });

    it('detects maintaining', () => {
      const weighIns = [
        { date: '2024-01-01', weight: 80 },
        { date: '2024-01-08', weight: 80.2 },
        { date: '2024-01-15', weight: 79.9 },
      ];

      expect(calculateTrend(weighIns)).toBe('maintaining');
    });
  });

  describe('Batch Client Operations', () => {
    it('gets all pending requests count', () => {
      const pendingCount = connections.filter((c) => c.status === 'pending').length;
      expect(pendingCount).toBe(1);
    });

    it('gets total connected clients count', () => {
      const connectedCount = connections.filter((c) => c.status === 'connected').length;
      expect(connectedCount).toBe(2);
    });
  });

  describe('Coach Code Validation', () => {
    const isValidCoachCode = (code: string): boolean => {
      if (!code || code.length !== 6) return false;
      return /^[A-Z0-9]{6}$/.test(code.toUpperCase());
    };

    it('validates correct codes', () => {
      expect(isValidCoachCode('ABC123')).toBe(true);
      expect(isValidCoachCode('XYZA99')).toBe(true);
    });

    it('rejects invalid codes', () => {
      expect(isValidCoachCode('')).toBe(false);
      expect(isValidCoachCode('ABC')).toBe(false); // Too short
      expect(isValidCoachCode('ABC1234')).toBe(false); // Too long
      expect(isValidCoachCode('ABC-12')).toBe(false); // Invalid chars
    });
  });
});
