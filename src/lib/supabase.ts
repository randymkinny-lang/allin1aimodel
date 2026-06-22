import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://bgdhwkslfiplbzinykuf.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjA3MzI5MDNkLTM0NDItNGY5OC1iYTkzLTIxNDkzMzVjZjc1YSJ9.eyJwcm9qZWN0SWQiOiJiZ2Rod2tzbGZpcGxiemlueWt1ZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc2NTYxNTA1LCJleHAiOjIwOTE5MjE1MDUsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.96I76mR4uM_ux4-8Sb2rkGM7KEmSTTbzQm8_KY2V8e4';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };