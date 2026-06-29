const { createClient } = require('@supabase/supabase-js')
const supabase = createClient('https://siigtinwowbnguxpwhfv.supabase.co', 'sb_publishable_s0G7WguFPJH_Oqs_9rOFoQ_GHiZkgxq')

async function main() {
  const { data: profiles } = await supabase.from('profiles').select('id, display_name, auth_email, role')
  console.log('Profiles:', JSON.stringify(profiles, null, 2))

  const { count: expCount } = await supabase.from('expenses').select('*', { count: 'exact', head: true })
  console.log('Expenses count:', expCount)

  const { data: cats } = await supabase.from('categories').select('name')
  console.log('Categories:', cats?.map(c => c.name))
}
main().catch(console.error)
