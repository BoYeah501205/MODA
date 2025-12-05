// ============================================================================
// Database Seed Script
// Populates database with sample data for development
// ============================================================================

import { getDatabase, closeDatabase, run, transaction } from './database.js';
import { v4 as uuidv4 } from 'uuid';

console.log('🌱 Seeding MODA Database...\n');

const now = new Date().toISOString();

// Sample data
const sampleYards = [
    { id: 'yard-autovol-main', name: 'Autovol Main Yard', location: 'On-site', capacity: 50, isAutovol: true },
    { id: 'yard-autovol-overflow', name: 'Autovol Overflow', location: 'On-site', capacity: 30, isAutovol: true },
    { id: 'yard-offsite-north', name: 'North Storage Yard', location: '123 Industrial Blvd', capacity: 40, isAutovol: false },
    { id: 'yard-offsite-south', name: 'South Staging Area', location: '456 Commerce Dr', capacity: 25, isAutovol: false }
];

const sampleCompanies = [
    { id: 'tc-heavy-haul', name: 'Heavy Haul Express', contactName: 'Mike Johnson', phone: '555-0101', email: 'dispatch@heavyhaul.com' },
    { id: 'tc-modular-movers', name: 'Modular Movers Inc', contactName: 'Sarah Chen', phone: '555-0102', email: 'ops@modularmovers.com' },
    { id: 'tc-precision', name: 'Precision Transport', contactName: 'Tom Williams', phone: '555-0103', email: 'schedule@precisiontrans.com' }
];

const sampleDepartments = [
    { id: 'auto-fc', name: 'Auto Floor/Ceiling' },
    { id: 'auto-walls', name: 'Auto Walls' },
    { id: 'mezzanine', name: 'Mezzanine' },
    { id: 'elec-ceiling', name: 'Electrical Ceiling' },
    { id: 'wall-set', name: 'Wall Set' },
    { id: 'ceiling-set', name: 'Ceiling Set' },
    { id: 'soffits', name: 'Soffits' },
    { id: 'mech-rough', name: 'Mechanical Rough' },
    { id: 'elec-rough', name: 'Electrical Rough' },
    { id: 'plumb-rough', name: 'Plumbing Rough' },
    { id: 'exteriors', name: 'Exteriors' },
    { id: 'drywall-bp', name: 'Drywall Board & Prep' },
    { id: 'drywall-ttp', name: 'Drywall Tape/Texture/Prime' },
    { id: 'roofing', name: 'Roofing' },
    { id: 'pre-finish', name: 'Pre-Finish' },
    { id: 'mech-trim', name: 'Mechanical Trim' },
    { id: 'elec-trim', name: 'Electrical Trim' },
    { id: 'plumb-trim', name: 'Plumbing Trim' },
    { id: 'final-finish', name: 'Final Finish' },
    { id: 'sign-off', name: 'Sign-Off' },
    { id: 'close-up', name: 'Close-Up' }
];

try {
    const db = getDatabase();
    
    transaction(() => {
        // Seed yards
        console.log('📦 Adding yards...');
        for (const yard of sampleYards) {
            run(`
                INSERT OR IGNORE INTO yards (id, name, location, capacity, is_autovol, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [yard.id, yard.name, yard.location, yard.capacity, yard.isAutovol ? 1 : 0, now]);
        }
        
        // Seed transport companies
        console.log('🚛 Adding transport companies...');
        for (const company of sampleCompanies) {
            run(`
                INSERT OR IGNORE INTO transport_companies (id, name, contact_name, phone, email, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [company.id, company.name, company.contactName, company.phone, company.email, now]);
        }
        
        // Seed departments
        console.log('🏢 Adding departments...');
        for (const dept of sampleDepartments) {
            run(`
                INSERT OR IGNORE INTO departments (id, name, created_at)
                VALUES (?, ?, ?)
            `, [dept.id, dept.name, now]);
        }
    });
    
    console.log('\n✅ Seed completed!');
    console.log(`   - ${sampleYards.length} yards`);
    console.log(`   - ${sampleCompanies.length} transport companies`);
    console.log(`   - ${sampleDepartments.length} departments`);
    
} catch (err) {
    console.error('❌ Seed failed:', err.message);
} finally {
    closeDatabase();
}
