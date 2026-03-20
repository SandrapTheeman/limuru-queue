// Hospital Queue System - Role-Based Access Control (RBAC) Middleware

// Role hierarchy (higher number = more privileges)
const ROLE_HIERARCHY = {
  admin: 6,
  doctor: 5,
  nurse: 4,
  receptionist: 3,
  patient: 2,
  kiosk: 1
};

// Permission definitions: action -> allowed roles
const PERMISSIONS = {
  // Queue permissions
  'queue.read': ['admin', 'doctor', 'nurse', 'receptionist'],
  'queue.create': ['admin', 'doctor', 'nurse', 'receptionist', 'kiosk'],
  'queue.update': ['admin', 'doctor', 'nurse', 'receptionist'],
  'queue.update.status': ['admin', 'doctor', 'nurse'],
  'queue.delete': ['admin'],
  'queue.call': ['admin', 'doctor', 'nurse', 'receptionist'],
  'queue.priority': ['admin', 'doctor'],
  
  // Patient permissions
  'patient.read': ['admin', 'doctor', 'nurse', 'receptionist'],
  'patient.read.all': ['admin', 'doctor', 'nurse', 'receptionist'],
  'patient.create': ['admin', 'receptionist', 'kiosk'],
  'patient.update': ['admin', 'doctor', 'nurse', 'receptionist'],
  'patient.delete': ['admin'],
  
  // Appointment permissions
  'appointment.read': ['admin', 'doctor', 'nurse', 'receptionist', 'patient'],
  'appointment.create': ['admin', 'doctor', 'nurse', 'receptionist', 'patient'],
  'appointment.update': ['admin', 'doctor', 'nurse', 'receptionist', 'patient'],
  'appointment.delete': ['admin'],
  
  // Message permissions
  'message.read': ['admin', 'doctor', 'nurse', 'receptionist', 'patient'],
  'message.send': ['admin', 'doctor', 'nurse', 'receptionist', 'patient'],
  'message.broadcast': ['admin', 'doctor', 'nurse'],
  'message.delete': ['admin'],
  
  // Notification permissions
  'notification.read': ['admin', 'doctor', 'nurse', 'receptionist', 'patient'],
  'notification.sms': ['admin', 'receptionist'],
  'notification.whatsapp': ['admin', 'receptionist'],
  'notification.broadcast': ['admin'],
  
  // Room permissions
  'room.read': ['admin', 'doctor', 'nurse', 'receptionist'],
  'room.create': ['admin'],
  'room.update': ['admin'],
  'room.delete': ['admin'],
  
  // Department permissions
  'department.read': ['admin', 'doctor', 'nurse', 'receptionist', 'patient'],
  'department.create': ['admin'],
  'department.update': ['admin'],
  'department.delete': ['admin'],
  
  // User management permissions
  'user.read': ['admin'],
  'user.create': ['admin'],
  'user.update': ['admin'],
  'user.delete': ['admin'],
  'user.manage': ['admin'],
  
  // Settings permissions
  'settings.read': ['admin'],
  'settings.write': ['admin'],
  
  // Reports/Analytics permissions
  'analytics.view': ['admin', 'doctor', 'nurse', 'receptionist'],
  'analytics.export': ['admin'],
  'audit.view': ['admin'],
  
  // Doctor Notes (Clinical Documentation) permissions
  'notes.read': ['admin', 'doctor', 'nurse'],
  'notes.read.all': ['admin'],
  'notes.create': ['admin', 'doctor'],
  'notes.update': ['admin', 'doctor'],
  'notes.update.any': ['admin'], // Can edit any note
  'notes.delete': ['admin'],
  'notes.view.patient': ['admin', 'doctor', 'nurse'],
  'notes.templates': ['admin', 'doctor', 'nurse'],
  'prescriptions.write': ['admin', 'doctor'],
  'diagnoses.write': ['admin', 'doctor']
};

/**
 * Check if a role has a specific permission
 */
function hasPermission(role, permission) {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    console.warn(`Permission '${permission}' is not defined`);
    return false;
  }
  return allowedRoles.includes(role);
}

/**
 * Check if user role meets minimum hierarchy level
 */
function hasMinLevel(role, minLevel) {
  const userLevel = ROLE_HIERARCHY[role] || 0;
  return userLevel >= minLevel;
}

/**
 * Check if user has any of the specified roles
 */
function hasAnyRole(userRole, allowedRoles) {
  return allowedRoles.includes(userRole);
}

/**
 * Middleware factory: Require specific permission(s)
 */
function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to perform this action'
      });
    }

    const userRole = req.user.role;

    // Check if user has at least one of the required permissions
    const hasAccess = permissions.some(permission => hasPermission(userRole, permission));

    if (!hasAccess) {
      // Log unauthorized access attempt
      console.warn({
        event: 'ACCESS_DENIED',
        user: req.user.id,
        email: req.user.email,
        role: userRole,
        required: permissions,
        ip: req.ip || req.connection.remoteAddress,
        path: req.path
      });

      return res.status(403).json({ 
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
}

/**
 * Middleware: Require specific roles only
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden',
        message: 'Your role does not have access to this resource'
      });
    }

    next();
  };
}

/**
 * Middleware: Require minimum role level
 */
function requireMinLevel(minLevel) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required'
      });
    }

    if (!hasMinLevel(req.user.role, minLevel)) {
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
}

/**
 * Middleware: Admin only
 */
function adminOnly(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Middleware: Staff only (not patient/kiosk)
 */
function staffOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      error: 'Authentication required'
    });
  }

  const staffRoles = ['admin', 'doctor', 'nurse', 'receptionist'];
  if (!staffRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false,
      error: 'Forbidden',
      message: 'Staff access required'
    });
  }

  next();
}

/**
 * Filter sensitive data based on role
 */
function filterData(data, role) {
  // Patients can only see their own sensitive data
  if (role === 'patient') {
    return data.map(item => ({
      ...item,
      // Remove sensitive fields for patients
      email: undefined,
      address: undefined,
      emergency_contact: undefined
    }));
  }
  
  // Receptionists can't see clinical notes
  if (role === 'receptionist') {
    return data.map(item => ({
      ...item,
      clinical_notes: undefined,
      diagnosis: undefined
    }));
  }
  
  return data;
}

/**
 * Get role display name
 */
function getRoleDisplayName(role) {
  const names = {
    admin: 'Administrator',
    doctor: 'Doctor',
    nurse: 'Nurse',
    receptionist: 'Receptionist',
    patient: 'Patient',
    kiosk: 'Kiosk'
  };
  return names[role] || role;
}

/**
 * Get accessible features for a role
 */
function getAccessibleFeatures(role) {
  const features = {
    dashboard: ['admin', 'doctor', 'nurse', 'receptionist', 'patient'],
    queue: ['admin', 'doctor', 'nurse', 'receptionist'],
    queue_create: ['admin', 'doctor', 'nurse', 'receptionist', 'kiosk'],
    queue_call: ['admin', 'doctor', 'nurse', 'receptionist'],
    queue_complete: ['admin', 'doctor', 'nurse'],
    patients: ['admin', 'doctor', 'nurse', 'receptionist'],
    patient_create: ['admin', 'receptionist', 'kiosk'],
    appointments: ['admin', 'doctor', 'nurse', 'receptionist', 'patient'],
    messages: ['admin', 'doctor', 'nurse', 'receptionist', 'patient'],
    messages_broadcast: ['admin', 'doctor', 'nurse'],
    notifications: ['admin', 'doctor', 'nurse', 'receptionist', 'patient'],
    notifications_sms: ['admin', 'receptionist'],
    rooms: ['admin', 'doctor', 'nurse', 'receptionist'],
    reports: ['admin', 'doctor', 'nurse'],
    settings: ['admin'],
    user_management: ['admin'],
    audit_logs: ['admin']
  };

  return Object.fromEntries(
    Object.entries(features)
      .filter(([key, roles]) => roles.includes(role))
      .map(([key, roles]) => [key, true])
  );
}

module.exports = {
  ROLE_HIERARCHY,
  PERMISSIONS,
  hasPermission,
  hasMinLevel,
  hasAnyRole,
  requirePermission,
  requireRole,
  requireMinLevel,
  adminOnly,
  staffOnly,
  filterData,
  getRoleDisplayName,
  getAccessibleFeatures
};
