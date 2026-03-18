const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://vkovflhltggyrgimeabp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrb3ZmbGhsdGdneXJnaW1lYWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzkyMTksImV4cCI6MjA4NzYxNTIxOX0.lhuwdgJMouVg08qgOc3GsTCXObGuRIIETC5ix6scYlE'
);

async function fixSlashDates() {
  const cols = ['order_date_planned', 'handover_date_actual', 'handover_date_planned'];
  for (const col of cols) {
    const { data } = await supabase.from('deals').select('id, ' + col).like(col, '%/%');
    if (data === null || data.length === 0) {
      console.log(col + ': no slash dates');
      continue;
    }
    let fixed = 0;
    for (const row of data) {
      const val = row[col];
      const m = val.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
      if (m) {
        const newVal = m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
        const { error } = await supabase.from('deals').update({ [col]: newVal }).eq('id', row.id);
        if (error) {
          console.error('Error:', row.id, error.message);
        } else {
          fixed++;
        }
      }
    }
    console.log(col + ': fixed ' + fixed + '/' + data.length);
  }
}

fixSlashDates();
