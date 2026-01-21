import { convertNlToSql } from './services/nlToSql';
import * as dotenv from 'dotenv';
dotenv.config();

const mockSchema = `DATABASE SCHEMA:
Total Tables Found: 1
All Table Names: health_data

COLUMN DETAILS (for first 40 tables):
- health_data: [age (int), sex (int), bmi (float), bp (float), s1 (float), s2 (float), s3 (float), s4 (float), s5 (float), s6 (float), y (int)]
`;

async function test() {
    const prompt = "Give me the all diabetes patient details which are there in this databases";
    console.log("Testing with prompt:", prompt);
    const result = await convertNlToSql(mockSchema, prompt);
    console.log("Result:", JSON.stringify(result, null, 2));
}

test();
