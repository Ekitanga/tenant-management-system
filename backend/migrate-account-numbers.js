const Database = require('better-sqlite3');
const path = require('path');
const { generateAccountNumber } = require('./account-number-generator');

const db = new Database(path.join(__dirname, 'database.db'));

async function migrateAccountNumbers() {
  console.log('\n🚀 Starting account number migration...\n');
  
  try {
    // account_number column already exists (we saw it in the schema)
    console.log('✅ account_number column exists\n');
    
    // Get units without account numbers (units.name is the unit number!)
    const units = db.prepare(`
      SELECT u.id, u.name as unit_number, p.name as property_name
      FROM units u
      JOIN properties p ON u.property_id = p.id
      WHERE u.account_number IS NULL OR u.account_number = ''
    `).all();
    
    console.log(`📊 Found ${units.length} units without account numbers\n`);
    
    if (units.length === 0) {
      console.log('✅ All units already have account numbers!\n');
      
      // Show existing account numbers
      const existing = db.prepare(`
        SELECT u.name as unit_number, u.account_number, p.name as property_name
        FROM units u
        JOIN properties p ON u.property_id = p.id
        WHERE u.account_number IS NOT NULL
        LIMIT 10
      `).all();
      
      if (existing.length > 0) {
        console.log('📋 Existing Account Numbers:');
        existing.forEach(sample => {
          console.log(`   ${sample.property_name} - Unit ${sample.unit_number}: ${sample.account_number}`);
        });
      }
      
      return;
    }
    
    let updated = 0;
    const updateStmt = db.prepare('UPDATE units SET account_number = ? WHERE id = ?');
    
    for (const unit of units) {
      try {
        let accountNumber = generateAccountNumber(unit.property_name, unit.unit_number);
        
        const existing = db.prepare('SELECT id FROM units WHERE account_number = ? AND id != ?')
          .get(accountNumber, unit.id);
        
        if (existing) {
          accountNumber = `${accountNumber}-U${unit.id}`;
          console.log(`⚠️  Duplicate detected - using: ${accountNumber}`);
        }
        
        updateStmt.run(accountNumber, unit.id);
        console.log(`✅ Unit ${unit.id} (${unit.property_name} - ${unit.unit_number}): ${accountNumber}`);
        
        updated++;
      } catch (error) {
        console.error(`❌ Error updating unit ${unit.id}:`, error.message);
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ MIGRATION COMPLETE!');
    console.log(`${'='.repeat(60)}`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   📊 Total:   ${units.length}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Create index for better performance
    try {
      db.prepare('CREATE INDEX IF NOT EXISTS idx_units_account_number ON units(account_number)').run();
      console.log('✅ Index created on account_number column\n');
    } catch (error) {
      console.log('⚠️  Index might already exist\n');
    }
    
    const samples = db.prepare(`
      SELECT u.name as unit_number, u.account_number, p.name as property_name
      FROM units u
      JOIN properties p ON u.property_id = p.id
      WHERE u.account_number IS NOT NULL
      LIMIT 10
    `).all();
    
    console.log('📋 Sample Account Numbers:');
    samples.forEach(sample => {
      console.log(`   ${sample.property_name} - Unit ${sample.unit_number}: ${sample.account_number}`);
    });
    
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    console.error('Error details:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

migrateAccountNumbers()
  .then(() => {
    console.log('\n✅ Migration script completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed!');
    console.error('Error:', error.message);
    process.exit(1);
  });