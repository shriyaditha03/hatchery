const supabaseUrl = 'https://uzecdpdwrhjcanszfcei.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZWNkcGR3cmhqY2Fuc3pmY2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzUyNTQsImV4cCI6MjA4NjI1MTI1NH0.WXvNk4x2l7o8lgtN3YRpe81FO6-iFPx3KLGcPh09SaU';

fetch(`${supabaseUrl}/rest/v1/tanks?select=*`, {
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
})
.then(res => res.json())
.then(data => {
  if (data.length > 0) {
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log("No tanks found.");
  }
})
.catch(err => console.error(err));
