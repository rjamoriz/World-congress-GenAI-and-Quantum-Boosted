#!/usr/bin/env node

/**
 * Import synthetic data to the backend API
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

async function importData() {
  console.log('🚀 Starting data import...\n');
  
  // Read data files
  const requestsPath = path.join(__dirname, '../data/output/requests.json');
  const hostsPath = path.join(__dirname, '../data/output/hosts.json');
  
  if (!fs.existsSync(requestsPath) || !fs.existsSync(hostsPath)) {
    console.error('❌ Data files not found. Run "npm run generate-data" first.');
    process.exit(1);
  }
  
  const requests = JSON.parse(fs.readFileSync(requestsPath, 'utf-8'));
  const hosts = JSON.parse(fs.readFileSync(hostsPath, 'utf-8'));
  
  console.log(`📦 Found ${requests.length} requests and ${hosts.length} hosts\n`);
  
  try {
    // Check API health
    console.log('🔍 Checking API health...');
    const healthResponse = await axios.get(`${API_URL}/health`);
    
    if (healthResponse.data.services.mongodb !== 'connected') {
      console.error('❌ MongoDB is not connected. Start services with: docker-compose up -d');
      process.exit(1);
    }
    
    console.log('✅ API is healthy\n');
    
    // Check if hosts already exist
    console.log('🔍 Checking existing data...');
    const existingHostsResponse = await axios.get(`${API_URL}/hosts`);
    const existingHosts = existingHostsResponse.data.data || [];
    
    // Import hosts if needed
    if (existingHosts.length === 0) {
      console.log('📤 Importing hosts...');
      const hostsResponse = await axios.post(`${API_URL}/hosts/bulk`, hosts);
      console.log(`✅ Imported ${hostsResponse.data.data.length} hosts\n`);
    } else {
      console.log(`⏭️  Skipping hosts (${existingHosts.length} already exist)\n`);
    }
    
    // Import requests (meetingType is already lowercase in the data)
    console.log('📤 Importing requests...');
    const requestsResponse = await axios.post(`${API_URL}/requests/bulk`, requests);
    console.log(`✅ Imported ${requestsResponse.data.data.length} requests\n`);
    
    console.log('🎉 Data import completed successfully!\n');
    console.log('Next steps:');
    console.log('  - View dashboard: http://localhost:3000');
    console.log('  - Test API: curl http://localhost:3001/api/requests');
    console.log('  - Qualify requests: curl -X POST http://localhost:3001/api/qualification/qualify/req_0001');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    
    if (error.response && error.response.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure the backend is running:');
      console.error('   npm run dev:backend');
    }
    
    process.exit(1);
  }
}

importData();
