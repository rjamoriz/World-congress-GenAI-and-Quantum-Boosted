console.log('🔍 Starting import debugging...');

try {
  console.log('1. Testing basic imports...');
  
  console.log('2. Testing express...');
  import('express').then(() => console.log('✅ express OK')).catch(e => console.error('❌ express:', e.message));
  
  console.log('3. Testing dotenv...');
  import('dotenv').then(() => console.log('✅ dotenv OK')).catch(e => console.error('❌ dotenv:', e.message));
  
  console.log('4. Testing database config...');
  import('./config/database').then(() => console.log('✅ database config OK')).catch(e => console.error('❌ database config:', e.message));
  
  console.log('5. Testing redis config...');
  import('./config/redis').then(() => console.log('✅ redis config OK')).catch(e => console.error('❌ redis config:', e.message));
  
  console.log('6. Testing logger...');
  import('./utils/logger').then(() => console.log('✅ logger OK')).catch(e => console.error('❌ logger:', e.message));
  
  console.log('7. Testing routes...');
  import('./routes/requests').then(() => console.log('✅ request routes OK')).catch(e => console.error('❌ request routes:', e.message));
  
  setTimeout(() => {
    console.log('🏁 Import test completed');
    process.exit(0);
  }, 2000);
  
} catch (error) {
  console.error('💥 Synchronous error:', error);
  process.exit(1);
}
