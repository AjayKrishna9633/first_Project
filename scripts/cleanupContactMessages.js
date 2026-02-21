/**
 * Cleanup Script for Old Contact Messages
 * 
 * This script deletes contact messages older than 30 days.
 * Can be run manually or scheduled via cron job.
 * 
 * Usage:
 *   node scripts/cleanupContactMessages.js
 *   node scripts/cleanupContactMessages.js --days=60  (custom days)
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import ContactMessage from '../models/contactMessageModel.js';

// Parse command line arguments
const args = process.argv.slice(2);
const daysArg = args.find(arg => arg.startsWith('--days='));
const daysOld = daysArg ? parseInt(daysArg.split('=')[1]) : 30;

async function cleanupOldMessages() {
    try {
        console.log('🔌 Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        console.log(`🗑️  Deleting messages older than ${daysOld} days (before ${cutoffDate.toLocaleDateString()})...`);
        
        const result = await ContactMessage.deleteMany({
            createdAt: { $lt: cutoffDate }
        });
        
        console.log(`✅ Successfully deleted ${result.deletedCount} old contact messages`);
        
        // Show statistics
        const remainingCount = await ContactMessage.countDocuments();
        const unreadCount = await ContactMessage.countDocuments({ isRead: false });
        
        console.log('\n📊 Current Statistics:');
        console.log(`   Total messages: ${remainingCount}`);
        console.log(`   Unread messages: ${unreadCount}`);
        console.log(`   Read messages: ${remainingCount - unreadCount}`);
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
}

// Run the cleanup
cleanupOldMessages();
