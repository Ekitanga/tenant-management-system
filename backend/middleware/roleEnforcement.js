// middleware/roleEnforcement.js
// STRICT ROLE ENFORCEMENT - Prevents super admin from doing operational tasks

const db = require('../database');

/**
 * Middleware to BLOCK super admin from operational routes
 * Super admin should ONLY manage system, NOT do landlord tasks
 */
const blockSuperAdminOperations = (req, res, next) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ 
      error: 'Access Denied',
      message: 'Super admins cannot perform operational tasks. These are reserved for landlords and property managers.',
      hint: 'Please login as a landlord to manage properties, tenants, and leases.'
    });
  }
  next();
};

/**
 * Middleware to allow ONLY super admin
 * For system management routes
 */
const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Access Denied',
      message: 'This action is restricted to super administrators only.'
    });
  }
  next();
};

/**
 * Enhanced roleMiddleware that enforces proper separation
 */
const strictRoleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access Denied',
        message: `This action requires one of these roles: ${allowedRoles.join(', ')}`,
        yourRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Check specific permission for landlord users
 */
const checkLandlordPermission = (permission) => {
  return (req, res, next) => {
    if (req.user.role === 'admin') {
      return res.status(403).json({ 
        error: 'Super admins cannot perform this action',
        message: 'Please use a landlord account'
      });
    }

    if (req.user.role === 'landlord') {
      // Landlords have all operational permissions by default
      return next();
    }

    // For other roles, check permissions
    try {
      const permissions = req.user.permissions ? JSON.parse(req.user.permissions) : {};
      
      if (!permissions[permission]) {
        return res.status(403).json({ 
          error: 'Permission Denied',
          message: `You don't have permission: ${permission}`,
          requiredPermission: permission
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

/**
 * Verify user owns or manages the property
 */
const verifyPropertyOwnership = (req, res, next) => {
  try {
    const propertyId = req.params.id || req.body.property_id;
    
    if (!propertyId) {
      return res.status(400).json({ error: 'Property ID required' });
    }

    // Super admin blocked
    if (req.user.role === 'admin') {
      return res.status(403).json({ 
        error: 'Super admins cannot manage properties',
        message: 'Use landlord account'
      });
    }

    // Landlord must own the property
    if (req.user.role === 'landlord') {
      const property = db.prepare(`
        SELECT id FROM properties 
        WHERE id = ? AND landlord_id = ?
      `).get(propertyId, req.user.id);
      
      if (!property) {
        return res.status(403).json({ 
          error: 'Access Denied',
          message: 'You do not own this property'
        });
      }
    }

    next();
  } catch (error) {
    console.error('❌ Property ownership verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

/**
 * Log role-based actions for audit trail
 */
const auditAction = (action) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Log after response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        user: req.user.username,
        role: req.user.role,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip
      };
      
      console.log(`📝 AUDIT: ${JSON.stringify(logEntry)}`);
      
      // Optionally save to database
      try {
        db.prepare(`
          INSERT INTO audit_logs (user_id, action, details, created_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `).run(req.user.id, action, JSON.stringify(logEntry));
      } catch (error) {
        // Don't fail request if audit logging fails
        console.error('⚠️  Audit logging failed:', error);
      }
    });
    
    next();
  };
};

module.exports = {
  blockSuperAdminOperations,
  superAdminOnly,
  strictRoleMiddleware,
  checkLandlordPermission,
  verifyPropertyOwnership,
  auditAction
};
