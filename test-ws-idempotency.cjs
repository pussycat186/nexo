const WebSocket = require('ws');

async function testWsIdempotency() {
  console.log('=== WS ACK + IDEMPOTENCY TEST ===');
  
  // First get a token
  const authRes = await fetch('http://localhost:5000/api/auth/device/challenge', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ handle: 'ws_test_user' })
  });
  
  console.log('Auth status:', authRes.status);
  
  // Connect WebSocket
  const ws = new WebSocket('ws://localhost:5000/ws?conv_id=test-conv&token=mock-token');
  
  ws.on('open', () => {
    console.log('1. WebSocket connected');
    
    // Send message with unique ID
    const msgId = 'unique-msg-' + Date.now();
    const msg = {
      type: 'message',
      msg_id: msgId,
      cipher: 'encrypted-content',
      nonce: 'test-nonce'
    };
    
    console.log('2. Sending message with ID:', msgId);
    ws.send(JSON.stringify(msg));
    
    // Simulate network drop and resend
    setTimeout(() => {
      console.log('3. Simulating reconnect - resending same message ID');
      ws.send(JSON.stringify(msg));
      
      setTimeout(() => {
        console.log('4. Check server logs for "duplicate" handling');
        ws.close();
      }, 1000);
    }, 500);
  });
  
  ws.on('message', (data) => {
    const parsed = JSON.parse(data);
    if (parsed.status === 'duplicate') {
      console.log('✅ DUPLICATE PREVENTED:', parsed.messageId);
    }
  });
  
  ws.on('error', (err) => {
    console.log('WebSocket error:', err.message);
  });
  
  ws.on('close', (code) => {
    console.log('5. WebSocket closed with code:', code);
    if (code === 4401) {
      console.log('   → Unauthorized (need valid token)');
    }
  });
}

testWsIdempotency().catch(console.error);