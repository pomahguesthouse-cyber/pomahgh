-- Fix booking agent that was accidentally overwritten with FAQ data
UPDATE agent_configs 
SET name = 'Reservasi Agent', 
    role = 'Proses booking, cek ketersediaan, update reservasi',
    category = 'specialist'
WHERE agent_id = 'booking';

-- Rename all "Bot" to "Agent"
UPDATE agent_configs SET name = 'CS & FAQ Agent' WHERE agent_id = 'faq';
UPDATE agent_configs SET name = 'Manager Agent' WHERE agent_id = 'manager';
UPDATE agent_configs SET name = 'Pricing Agent' WHERE agent_id = 'pricing';
