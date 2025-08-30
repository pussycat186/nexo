const crypto = require('crypto');

async function testAuthFlow() {
  const BASE_URL = 'http://localhost:5000/api';
  const handle = 'test_user_' + Date.now();
  const deviceId = 'device_' + Date.now();
  
  console.log('=== AUTH & DEVICE FLOW ===');
  
  // 1. Register
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      handle,
      ed25519_pub: 'mock_ed25519_public_key',
      x25519_pub: 'mock_x25519_public_key'
    })
  });
  const regData = await regRes.json();
  console.log('1. Register:', regRes.status, regData.nonce ? 'nonce received' : 'error');
  
  // 2. Get challenge
  const chalRes = await fetch(`${BASE_URL}/auth/device/challenge`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ handle })
  });
  const chalData = await chalRes.json();
  console.log('2. Challenge:', chalRes.status, 'nonce:', chalData.nonce?.substring(0, 20) + '...');
  
  // 3. Register device (mock signature)
  const devRes = await fetch(`${BASE_URL}/auth/device/register`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      handle,
      device_id: deviceId,
      nonce: chalData.nonce,
      signature: Buffer.from('mock_signature').toString('base64'),
      ed25519_pub: 'device_ed25519_pub',
      x25519_pub: 'device_x25519_pub',
      device_name: 'Test Device'
    })
  });
  const devData = await devRes.json();
  console.log('3. Device register:', devRes.status);
  
  if (devData.access) {
    console.log('4. Access token received:', devData.access.substring(0, 30) + '...');
    console.log('5. Refresh token received:', devData.refresh ? 'yes' : 'no');
    
    // 4. List devices
    const listRes = await fetch(`${BASE_URL}/devices`, {
      headers: { 'Authorization': `Bearer ${devData.access}` }
    });
    const devices = await listRes.json();
    console.log('6. Device list:', Array.isArray(devices) ? `${devices.length} devices` : 'error');
    
    // 5. Test refresh
    if (devData.refresh) {
      const refRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ refresh_token: devData.refresh })
      });
      console.log('7. Refresh token:', refRes.status === 200 ? 'SUCCESS' : 'FAILED');
    }
    
    // 6. Revoke device
    if (devices.length > 0) {
      const revokeId = devices[0].id;
      const revRes = await fetch(`${BASE_URL}/devices/${revokeId}/revoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${devData.access}` }
      });
      console.log('8. Device revoke:', revRes.status === 200 ? 'SUCCESS' : 'FAILED');
      
      // 7. Try to use revoked token (should fail)
      const testRes = await fetch(`${BASE_URL}/devices`, {
        headers: { 'Authorization': `Bearer ${devData.access}` }
      });
      console.log('9. Revoked token test:', testRes.status === 401 ? 'CORRECTLY REJECTED (401)' : `UNEXPECTED: ${testRes.status}`);
    }
  }
}

testAuthFlow().catch(console.error);