@echo off
echo ========================================
echo   SPIRALDART TMS - DATABASE VIEWER
echo ========================================
echo.

cd backend

echo Creating database checker script...
(
echo const db = require^('./database'^);
echo.
echo console.log^('\n========================================'^);
echo console.log^('   DATABASE CONTENTS'^);
echo console.log^('========================================\n'^);
echo.
echo console.log^('\n=== USERS ==='^);
echo const users = db.prepare^('SELECT id, username, email, role, is_active FROM users'^).all^(^);
echo console.table^(users^);
echo.
echo console.log^('\n=== TENANTS ==='^);
echo const tenants = db.prepare^('SELECT t.*, u.username FROM tenants t JOIN users u ON t.user_id = u.id'^).all^(^);
echo console.table^(tenants^);
echo.
echo console.log^('\n=== PROPERTIES ==='^);
echo const properties = db.prepare^('SELECT * FROM properties'^).all^(^);
echo console.table^(properties^);
echo.
echo console.log^('\n=== UNITS ==='^);
echo const units = db.prepare^('SELECT u.*, p.name as property FROM units u JOIN properties p ON u.property_id = p.id'^).all^(^);
echo console.table^(units^);
echo.
echo console.log^('\n=== LEASES ==='^);
echo const leases = db.prepare^('SELECT l.*, t.full_name as tenant, u.name as unit FROM leases l JOIN tenants t ON l.tenant_id = t.id JOIN units u ON l.unit_id = u.id'^).all^(^);
echo console.table^(leases^);
echo.
echo console.log^('\n=== PAYMENTS ==='^);
echo const payments = db.prepare^('SELECT p.*, t.full_name as tenant FROM payments p JOIN tenants t ON p.tenant_id = t.id ORDER BY payment_date DESC LIMIT 10'^).all^(^);
echo console.table^(payments^);
echo.
echo console.log^('\n=== MAINTENANCE REQUESTS ==='^);
echo const maintenance = db.prepare^('SELECT mr.*, t.full_name as tenant, u.name as unit FROM maintenance_requests mr JOIN tenants t ON mr.tenant_id = t.id JOIN units u ON mr.unit_id = u.id ORDER BY reported_date DESC LIMIT 10'^).all^(^);
echo console.table^(maintenance^);
echo.
echo console.log^('\n========================================'^);
echo console.log^('   END OF DATABASE DUMP'^);
echo console.log^('========================================\n'^);
echo.
echo db.close^(^);
) > check-database.js

echo.
echo Running database check...
echo.

node check-database.js

echo.
echo ========================================
echo.
pause
