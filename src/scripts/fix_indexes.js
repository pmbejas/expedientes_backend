const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

async function fixIndexes() {
  try {
    // Ensure connection
    await sequelize.authenticate();
    console.log('Database connected.');

    console.log('Inspecting indexes on "jueces" table...');
    // Use raw query with type SELECT to get cleaner results and avoid "delete property meta" error
    const indexes = await sequelize.query("SHOW INDEX FROM `jueces`", { type: QueryTypes.SELECT });
    
    if (!indexes || indexes.length === 0) {
        console.log('No indexes found or table might not exist.');
        return;
    }

    // With SELECT type, indexes is the array of rows directly
    console.log('Sample Index Row:', indexes[0]);

    // Normalize keys to lower case for safety check
    const vocaliaIndexes = indexes.filter(idx => {
        const colName = idx.Column_name || idx.column_name; // Try both casings
        const keyName = idx.Key_name || idx.key_name;
        // Check for 'vocalia' column and ensure it's NOT PRIMARY and NOT the foreign key if any (but usually FK is on ID)
        // We want to drop explicitly the UNIQUE constraints that might be causing "Too many keys"
        return colName === 'vocalia' && keyName !== 'PRIMARY';
    });
    
    console.log(`Found ${vocaliaIndexes.length} indexes on 'vocalia'.`);

    if (vocaliaIndexes.length > 0) {
      const indexNames = [...new Set(vocaliaIndexes.map(idx => idx.Key_name || idx.key_name))];

      for (const indexName of indexNames) {
        console.log(`Dropping index: ${indexName}`);
        await sequelize.query(`DROP INDEX \`${indexName}\` ON \`jueces\``);
      }
      console.log('Redundant indexes dropped.');
    } else {
      console.log('No indexes found on "vocalia" to drop.');
    }

  } catch (error) {
    if (error.original && error.original.code === 'ER_NO_SUCH_TABLE') {
        console.log('Table "jueces" does not exist. Skipping index fix.');
    } else {
        console.error('Error fixing indexes:', error);
    }
  } finally {
    await sequelize.close();
  }
}

fixIndexes();
