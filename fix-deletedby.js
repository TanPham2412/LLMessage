// Script to migrate old deletedBy data to new schema
const mongoose = require('mongoose');
require('dotenv').config();

async function fixDeletedBy() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const conversationsCollection = db.collection('conversations');

    // Find all conversations with deletedBy data
    const conversations = await conversationsCollection.find({
      deletedBy: { $exists: true, $ne: [] }
    }).toArray();

    console.log(`Found ${conversations.length} conversations with deletedBy data`);

    for (const conv of conversations) {
      // Check if deletedBy has old format (ObjectIds directly) or mixed format
      let needsUpdate = false;
      
      for (const item of conv.deletedBy) {
        // If item is an ObjectId (not an object with 'user' field), needs update
        if (!item.user) {
          needsUpdate = true;
          break;
        }
      }
      
      if (needsUpdate) {
        console.log(`Converting conversation ${conv._id}...`);
        
        // Clear old deletedBy data (reset to empty array)
        await conversationsCollection.updateOne(
          { _id: conv._id },
          { $set: { deletedBy: [] } }
        );
        
        console.log(`✓ Cleared deletedBy for conversation ${conv._id}`);
      }
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

fixDeletedBy();
