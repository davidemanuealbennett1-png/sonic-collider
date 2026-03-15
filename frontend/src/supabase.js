import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fnqvotibheiadhsrmloz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucXZvdGliaGVpYWRoc3JtbG96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDg0MDcsImV4cCI6MjA4OTA4NDQwN30.d1NfWni7dxgKsS4OPM-zAjJbRKb-aOwBvo_YJVX9Lhs'

export const supabase = createClient(supabaseUrl, supabaseKey)