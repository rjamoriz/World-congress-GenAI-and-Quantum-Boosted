const axios = require('axios');

async function testDWave() {
  console.log('🧪 Testing D-Wave Integration...');
  
  try {
    const response = await axios.post('http://localhost:3001/api/schedule/optimize', {
      algorithm: 'quantum',
      quantumConfig: {
        backend: 'dwave',
        solver: 'simulated_annealing',
        num_reads: 10
      },
      constraints: {
        eventStartDate: '2025-11-15',
        eventEndDate: '2025-11-22'
      }
    });
    
    console.log('✅ API Response:');
    console.log('Algorithm:', response.data.data.algorithm);
    console.log('Explanation:', response.data.data.explanation);
    console.log('Assignments:', response.data.data.assignments.length);
    
    // Check if D-Wave was actually used
    if (response.data.data.explanation.includes('D-Wave') || response.data.data.explanation.includes('quantum annealing')) {
      console.log('🌊 SUCCESS: D-Wave quantum annealing was used!');
    } else if (response.data.data.explanation.includes('Qiskit')) {
      console.log('⚠️ WARNING: Still using Qiskit instead of D-Wave');
      console.log('This means the backend routing needs to be fixed');
    } else {
      console.log('🤔 UNKNOWN: Unexpected optimization method');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDWave();
