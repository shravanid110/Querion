-- Example PostgreSQL Queries for Querion Integration

-- 1. Insert a New User with Role
-- user_id is auto-generated via gen_random_uuid()
INSERT INTO users (name, email, password_hash, role)
VALUES ('Demo Admin', 'admin@querion.ai', '$2b$10$YourHashedPasswordHere', 'admin');

-- 2. Save a Connected Database Metadata
INSERT INTO database_connections (user_id, database_name, database_type, host, port)
VALUES ('USER_ID_UUID', 'Production_DB', 'PostgreSQL', 'db.external.com', 5432);

-- 3. Store a Natural Language Prompt
INSERT INTO prompts (user_id, prompt_text)
VALUES ('USER_ID_UUID', 'Show me all customers who spent more than $500 last month.');

-- 4. Store a Generated Query Linked to Prompt
INSERT INTO generated_queries (prompt_id, generated_sql, execution_status)
VALUES ('PROMPT_ID_UUID', 'SELECT * FROM customers WHERE spending > 500;', 'success');

-- 5. Store Query Results in JSONB
-- result_data is the exact JSON structure returned from execution
INSERT INTO query_results (query_id, result_data)
VALUES ('QUERY_ID_UUID', '{"count": 12, "data": [{"id": 1, "name": "Alice"}]}');

-- 6. Log a Security Action
INSERT INTO activity_logs (user_id, action)
VALUES ('USER_ID_UUID', 'Created new database connection: Production_DB');

-- 7. Start a New Chat Session
INSERT INTO chat_sessions (user_id, session_title)
VALUES ('USER_ID_UUID', 'Financial Analysis - March 2026');

-- 8. Add Messages to Chat Session
INSERT INTO chat_messages (session_id, sender, message_text)
VALUES ('SESSION_ID_UUID', 'user', 'Analyze my sales data.');

INSERT INTO chat_messages (session_id, sender, message_text)
VALUES ('SESSION_ID_UUID', 'assistant', 'Sure! Which database should I use for this analysis?');

-- 9. Select all prompts for a user
SELECT * FROM prompts WHERE user_id = 'USER_ID_UUID' ORDER BY created_at DESC;

-- 10. Complex Select: Get charts with their original prompt and user metadata
SELECT 
    c.chart_type, 
    c.chart_data, 
    p.prompt_text, 
    u.name as creator
FROM charts c
JOIN generated_queries gq ON c.query_id = gq.query_id
JOIN prompts p ON gq.prompt_id = p.prompt_id
JOIN users u ON p.user_id = u.user_id
LIMIT 10;
