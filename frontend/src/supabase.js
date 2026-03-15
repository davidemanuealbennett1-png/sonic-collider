import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fnqvotibheiadhsrmloz.supabase.co'
const supabaseKey = 'sb_publishable_TDw4uSE4engFSsbcIJMp8Q_wFTjKuYd'

export const supabase = createClient(supabaseUrl, supabaseKey)