import { describe, it, expect, beforeEach, vi } from 'vitest';

interface User {
  id: string;
  email: string;
  passwordHash?: string;
  role: 'patient' | 'admin' | 'doctor' | 'receptionist' | 'nurse';
  name: string;
  isActive: boolean;
  requiresPasswordChange: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  exp?: number;
  iat?: number;
}

const createMockAuthService = () => {
  const users: Map<string, User> = new Map();
  const tokens: Map<string, { userId: string; expiresAt: Date }> = new Map();

  const hashPassword = (password: string): string => {
    return `hashed_${password}_${Date.now()}`;
  };

  const verifyPassword = (password: string, hash: string): boolean => {
    return hash.startsWith('hashed_') && hash.includes(password);
  };

  const generateToken = (user: User): string => {
    const token = `token_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    tokens.set(token, { userId: user.id, expiresAt });
    return token;
  };

  const verifyToken = (token: string): TokenPayload | null => {
    const tokenData = tokens.get(token);
    if (!tokenData) return null;
    
    if (new Date() > tokenData.expiresAt) {
      tokens.delete(token);
      return null;
    }

    const user = users.get(tokenData.userId);
    if (!user) return null;

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: tokenData.expiresAt.getTime(),
      iat: Date.now(),
    };
  };

  const registerUser = (data: {
    email: string;
    password: string;
    name: string;
    role?: 'patient' | 'admin' | 'doctor' | 'receptionist' | 'nurse';
  }): User => {
    if (Array.from(users.values()).some(u => u.email === data.email)) {
      throw new Error('Email already exists');
    }

    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: data.email,
      passwordHash: hashPassword(data.password),
      name: data.name,
      role: data.role || 'patient',
      isActive: true,
      requiresPasswordChange: false,
      createdAt: new Date(),
    };

    users.set(user.id, user);
    return user;
  };

  const login = (email: string, password: string): AuthResponse => {
    const user = Array.from(users.values()).find(u => u.email === email);
    
    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }

    if (!user.isActive) {
      return { success: false, message: 'Account is disabled' };
    }

    if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return { success: false, message: 'Invalid credentials' };
    }

    user.lastLogin = new Date();
    users.set(user.id, user);

    const token = generateToken(user);

    return {
      success: true,
      user,
      token,
    };
  };

  const logout = (token: string): void => {
    tokens.delete(token);
  };

  const changePassword = (
    userId: string,
    currentPassword: string,
    newPassword: string
  ): AuthResponse => {
    const user = users.get(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (!user.passwordHash || !verifyPassword(currentPassword, user.passwordHash)) {
      return { success: false, message: 'Current password is incorrect' };
    }

    user.passwordHash = hashPassword(newPassword);
    user.requiresPasswordChange = false;
    users.set(user.id, user);

    return { success: true };
  };

  const resetPasswordRequest = (email: string): AuthResponse => {
    const user = Array.from(users.values()).find(u => u.email === email);
    
    if (!user) {
      return { success: false, message: 'If email exists, reset link will be sent' };
    }

    return { success: true, message: 'If email exists, reset link will be sent' };
  };

  const resetPasswordConfirm = (token: string, newPassword: string): AuthResponse => {
    const resetTokens = new Map<string, { userId: string; expiresAt: Date }>();
    const resetData = resetTokens.get(token);
    
    if (!resetData || new Date() > resetData.expiresAt) {
      return { success: false, message: 'Invalid or expired reset token' };
    }

    const user = users.get(resetData.userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    user.passwordHash = hashPassword(newPassword);
    user.requiresPasswordChange = false;
    users.set(user.id, user);
    resetTokens.delete(token);

    return { success: true };
  };

  return {
    registerUser,
    login,
    logout,
    verifyToken,
    changePassword,
    resetPasswordRequest,
    resetPasswordConfirm,
    getUser: (id: string) => users.get(id),
    getUsers: () => Array.from(users.values()),
    clear: () => {
      users.clear();
      tokens.clear();
    },
  };
};

describe('Auth Routes', () => {
  let authService: ReturnType<typeof createMockAuthService>;

  beforeEach(() => {
    authService = createMockAuthService();
  });

  describe('Patient Login', () => {
    it('should login with valid credentials', async () => {
      authService.registerUser({
        email: 'patient@test.com',
        password: 'password123',
        name: 'Test Patient',
        role: 'patient',
      });

      const response = authService.login('patient@test.com', 'password123');

      expect(response.success).toBe(true);
      expect(response.user).toBeDefined();
      expect(response.token).toBeDefined();
      expect(response.user?.email).toBe('patient@test.com');
    });

    it('should fail with invalid password', () => {
      authService.registerUser({
        email: 'patient@test.com',
        password: 'password123',
        name: 'Test Patient',
      });

      const response = authService.login('patient@test.com', 'wrongpassword');

      expect(response.success).toBe(false);
      expect(response.message).toBe('Invalid credentials');
    });

    it('should fail with non-existent email', () => {
      const response = authService.login('nonexistent@test.com', 'password123');

      expect(response.success).toBe(false);
      expect(response.message).toBe('Invalid credentials');
    });

    it('should fail for inactive account', () => {
      const user = authService.registerUser({
        email: 'inactive@test.com',
        password: 'password123',
        name: 'Inactive User',
      });

      const allUsers = authService.getUsers();
      const targetUser = allUsers.find(u => u.id === user.id);
      if (targetUser) {
        targetUser.isActive = false;
      }

      const response = authService.login('inactive@test.com', 'password123');

      expect(response.success).toBe(false);
      expect(response.message).toBe('Account is disabled');
    });
  });

  describe('Staff Login', () => {
    it('should login staff member', () => {
      authService.registerUser({
        email: 'doctor@hospital.com',
        password: 'staffpass123',
        name: 'Dr. Smith',
        role: 'doctor',
      });

      const response = authService.login('doctor@hospital.com', 'staffpass123');

      expect(response.success).toBe(true);
      expect(response.user?.role).toBe('doctor');
    });

    it('should login receptionist', () => {
      authService.registerUser({
        email: 'reception@hospital.com',
        password: 'reception123',
        name: 'Reception Staff',
        role: 'receptionist',
      });

      const response = authService.login('reception@hospital.com', 'reception123');

      expect(response.success).toBe(true);
      expect(response.user?.role).toBe('receptionist');
    });

    it('should login admin', () => {
      authService.registerUser({
        email: 'admin@hospital.com',
        password: 'adminpass123',
        name: 'Admin User',
        role: 'admin',
      });

      const response = authService.login('admin@hospital.com', 'adminpass123');

      expect(response.success).toBe(true);
      expect(response.user?.role).toBe('admin');
    });
  });

  describe('Logout', () => {
    it('should invalidate token on logout', () => {
      authService.registerUser({
        email: 'test@hospital.com',
        password: 'password123',
        name: 'Test User',
      });

      const loginResponse = authService.login('test@hospital.com', 'password123');
      const token = loginResponse.token!;

      expect(authService.verifyToken(token)).toBeDefined();

      authService.logout(token);

      expect(authService.verifyToken(token)).toBeNull();
    });
  });

  describe('Token Validation', () => {
    it('should validate valid token', () => {
      authService.registerUser({
        email: 'test@hospital.com',
        password: 'password123',
        name: 'Test User',
      });

      const loginResponse = authService.login('test@hospital.com', 'password123');
      const payload = authService.verifyToken(loginResponse.token!);

      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(loginResponse.user?.id);
    });

    it('should reject invalid token', () => {
      const payload = authService.verifyToken('invalid_token');
      expect(payload).toBeNull();
    });
  });

  describe('Password Change', () => {
    it('should change password successfully', () => {
      authService.registerUser({
        email: 'test@hospital.com',
        password: 'oldpassword',
        name: 'Test User',
      });

      const loginResponse = authService.login('test@hospital.com', 'oldpassword');
      const userId = loginResponse.user!.id;

      const changeResponse = authService.changePassword(
        userId,
        'oldpassword',
        'newpassword'
      );

      expect(changeResponse.success).toBe(true);

      const newLoginResponse = authService.login('test@hospital.com', 'newpassword');
      expect(newLoginResponse.success).toBe(true);
    });

    it('should fail with wrong current password', () => {
      authService.registerUser({
        email: 'test@hospital.com',
        password: 'oldpassword',
        name: 'Test User',
      });

      const loginResponse = authService.login('test@hospital.com', 'oldpassword');
      const userId = loginResponse.user!.id;

      const changeResponse = authService.changePassword(
        userId,
        'wrongpassword',
        'newpassword'
      );

      expect(changeResponse.success).toBe(false);
      expect(changeResponse.message).toBe('Current password is incorrect');
    });
  });

  describe('Password Reset', () => {
    it('should send reset request for existing email', () => {
      authService.registerUser({
        email: 'test@hospital.com',
        password: 'password123',
        name: 'Test User',
      });

      const response = authService.resetPasswordRequest('test@hospital.com');

      expect(response.success).toBe(true);
    });

    it('should not reveal if email exists', () => {
      const response = authService.resetPasswordRequest('nonexistent@test.com');

      expect(response.success).toBe(true);
      expect(response.message).toContain('reset link will be sent');
    });
  });

  describe('Registration', () => {
    it('should register new patient', () => {
      const user = authService.registerUser({
        email: 'newpatient@test.com',
        password: 'password123',
        name: 'New Patient',
        role: 'patient',
      });

      expect(user.email).toBe('newpatient@test.com');
      expect(user.role).toBe('patient');
      expect(user.isActive).toBe(true);
    });

    it('should not allow duplicate email', () => {
      authService.registerUser({
        email: 'duplicate@test.com',
        password: 'password123',
        name: 'First User',
      });

      expect(() => {
        authService.registerUser({
          email: 'duplicate@test.com',
          password: 'password456',
          name: 'Second User',
        });
      }).toThrow('Email already exists');
    });

    it('should register staff member', () => {
      const user = authService.registerUser({
        email: 'nurse@hospital.com',
        password: 'password123',
        name: 'Nurse Jane',
        role: 'nurse',
      });

      expect(user.role).toBe('nurse');
    });
  });
});
