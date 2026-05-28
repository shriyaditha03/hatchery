const url = 'https://uzecdpdwrhjcanszfcei.supabase.co/rest/v1/';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZWNkcGR3cmhqY2Fuc3pmY2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzUyNTQsImV4cCI6MjA4NjI1MTI1NH0.WXvNk4x2l7o8lgtN3YRpe81FO6-iFPx3KLGcPh09SaU';

async function getSwagger() {
  const response = await fetch(url, {
    headers: {
      'apikey': apiKey,
    }
  });
  const data = await response.json();
  console.log('Keys in returned object:', Object.keys(data));
  if (data.paths) {
    console.log('Paths:', Object.keys(data.paths));
  }
}

getSwagger();
