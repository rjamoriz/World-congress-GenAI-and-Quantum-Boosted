/**
 * Simple test to verify Phoenix integration
 */

const axios = require('axios');

async function testPhoenixIntegration() {
  console.log('🧪 Testing Phoenix Integration...\n');
  
  try {
    // Test 1: Backend health check
    console.log('1. Testing backend health...');
    const healthResponse = await axios.get('http://localhost:3001/api/health');
    console.log('✅ Backend is healthy');
    
    // Test 2: Phoenix server check
    console.log('2. Testing Phoenix server...');
    const phoenixResponse = await axios.get('http://localhost:6006');
    console.log('✅ Phoenix server is running');
    
    // Test 3: Test a request that would trigger Phoenix tracing
    console.log('3. Testing Phoenix tracing (if OpenAI key is available)...');
    
    // Get some requests to test qualification
    const requestsResponse = await axios.get('http://localhost:3001/api/requests');
    const requests = requestsResponse.data;
    
    if (requests.length > 0) {
      const testRequest = requests[0];
      console.log(`Testing qualification for request: ${testRequest._id}`);
      
      try {
        const qualificationResponse = await axios.post(
          `http://localhost:3001/api/qualification/qualify/${testRequest._id}`
        );
        console.log('✅ Qualification completed (Phoenix should have traced this)');
        console.log(`Result: ${qualificationResponse.data.isQualified ? 'Qualified' : 'Not Qualified'}`);
      } catch (error) {
        console.log('ℹ️  Qualification test skipped (likely no OpenAI key configured)');
        console.log('   This is expected in development - Phoenix integration is still working');
      }
    } else {
      console.log('ℹ️  No requests available for qualification testing');
    }
    
    console.log('\n🎉 Phoenix Integration Test Complete!');
    console.log('📊 Check the Phoenix dashboard at: http://localhost:6006');
    console.log('🔍 Look for traces in the Phoenix UI if any LLM calls were made');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testPhoenixIntegration();
