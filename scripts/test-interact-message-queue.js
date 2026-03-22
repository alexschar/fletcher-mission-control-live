const fs = require('fs');
const path = require('path');
const {
  supabase,
  createInteractMessage,
  getPendingInteractMessages,
  markInteractMessageProcessed,
} = require('../lib/supabase');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function ensureTableExists() {
  const { error } = await supabase.from('interact_messages').select('id', { count: 'exact', head: true });
  if (error) throw error;
}

async function main() {
  loadEnvFile(path.join(__dirname, '..', '.env.local'));

  console.log('Verifying interact_messages table access...');
  await ensureTableExists();
  console.log('✅ interact_messages table reachable');

  const uniqueMessage = `queue test ${Date.now()}`;
  const created = await createInteractMessage({
    agent_target: 'sawyer',
    element_context: '[task card — Queue verification]',
    user_message: uniqueMessage,
    status: 'pending',
  });
  console.log('✅ Inserted pending interact message:', created.id);

  const pending = await getPendingInteractMessages();
  const found = pending.find((row) => row.id === created.id);
  if (!found) {
    throw new Error('Inserted message was not returned by getPendingInteractMessages()');
  }
  console.log('✅ Pending interact message query returned inserted row');

  const processed = await markInteractMessageProcessed(created.id);
  if (!processed || processed.status !== 'processed') {
    throw new Error('markInteractMessageProcessed() did not set status=processed');
  }
  console.log('✅ markInteractMessageProcessed() updated row');

  const { data: finalRow, error: finalError } = await supabase
    .from('interact_messages')
    .select('*')
    .eq('id', created.id)
    .maybeSingle();

  if (finalError) throw finalError;
  if (!finalRow || finalRow.status !== 'processed') {
    throw new Error('Final Supabase row verification failed');
  }
  console.log('✅ Final row verification passed');
}

main().catch((error) => {
  console.error('❌ Interact queue verification failed');
  console.error(error);
  process.exit(1);
});
