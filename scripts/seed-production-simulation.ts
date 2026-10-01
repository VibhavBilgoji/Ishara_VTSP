import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function seed() {
  console.log('🚀 Starting Ishara Production Seed...')

  // 1. Hospital Organization
  const hospitalId = 'a0000000-0000-0000-0000-000000000001'
  const { error: hospError } = await supabase.from('hospitals').upsert(
    {
      id: hospitalId,
      name: 'Ishara Demo Hospital',
    },
    { onConflict: 'id' }
  )

  if (hospError) {
    throw hospError
  } else {
    console.log('✅ Hospital: Ishara Demo Hospital')
  }

  // 2. Production Users (Doctors and Interpreters)
  const usersToSeed = [
    {
      email: 'dr.sharma@apollo.health',
      password: 'Ishara2026!',
      fullName: 'Dr. Rajesh Sharma (Emergency Medicine)',
      role: 'doctor',
      hospitalId: hospitalId,
    },
    {
      email: 'dr.verma@apollo.health',
      password: 'Ishara2026!',
      fullName: 'Dr. Anjali Verma (Critical Care)',
      role: 'doctor',
      hospitalId: hospitalId,
    },
    {
      email: 'ananya.isl@relay.org',
      password: 'Ishara2026!',
      fullName: 'Ananya Deshmukh (Certified ISL A-Grade)',
      role: 'interpreter',
      hospitalId: null,
      presenceStatus: 'available',
    },
    {
      email: 'vikram.isl@relay.org',
      password: 'Ishara2026!',
      fullName: 'Vikram Mehta (Certified ISL Medical)',
      role: 'interpreter',
      hospitalId: null,
      presenceStatus: 'offline',
    },
  ]

  for (const user of usersToSeed) {
    let userId: string | null = null

    // Check if user already exists in auth.users
    const { data: existingUserList, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError
    const found = existingUserList?.users?.find((u) => u.email === user.email)

    if (found) {
      userId = found.id
      // Update password and metadata
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.fullName, role: user.role },
      })
      if (updateError) throw updateError
      console.log(`🔄 Updated existing user auth: ${user.email}`)
    } else {
      // Create user
      const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.fullName, role: user.role },
      })

      if (createError) {
        console.error(`Error creating ${user.email}:`, createError)
        throw createError
      }
      userId = newUserData.user.id
      console.log(`✅ Created user auth: ${user.email}`)
    }

    if (userId) {
      // Upsert into public.profiles
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: userId,
          role: user.role,
          full_name: user.fullName,
          hospital_id: user.hospitalId,
        },
        { onConflict: 'id' }
      )

      if (profileError) {
        throw profileError
      } else {
        console.log(`✅ Profile: ${user.fullName} (${user.role})`)
      }

      // If interpreter, upsert presence
      if (user.role === 'interpreter') {
        const { error: presError } = await supabase.from('interpreter_presence').upsert(
          {
            interpreter_id: userId,
            status: user.presenceStatus || 'available',
            last_heartbeat: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'interpreter_id' }
        )

        if (presError) {
          throw presError
        } else {
          console.log(`✅ Interpreter Presence: ${user.email} -> ${user.presenceStatus}`)
        }
      }
    }
  }

  // 3. Initial Production Bedside Patients (Sessions)
  const initialSessions = [
    {
      bed_label: 'bed 4a',
      hospital_id: hospitalId,
      patient_display_name: 'Bed 4A - Ramesh Kumar (ISL)',
      status: 'active',
      active_mode: 'pictogram',
    },
    {
      bed_label: 'icu bed 2',
      hospital_id: hospitalId,
      patient_display_name: 'ICU Bed 2 - Sunita Patel (Deaf/Mute)',
      status: 'active',
      active_mode: 'pictogram',
    },
  ]

  for (const session of initialSessions) {
    const { data: creator, error: creatorError } = await supabase.from('profiles')
      .select('id').eq('hospital_id', hospitalId).eq('role', 'doctor').limit(1).single()
    if (creatorError) throw creatorError
    const { data: existing, error: lookupError } = await supabase.from('sessions').select('id')
      .eq('hospital_id', hospitalId).eq('bed_label', session.bed_label).neq('status', 'closed').maybeSingle()
    if (lookupError) throw lookupError
    // Preserve existing sessions and audit data when the demo seed is rerun.
    if (existing) continue
    const { error: sessError } = await supabase.from('sessions').insert({ ...session, created_by: creator.id })
    if (sessError) {
      throw sessError
    } else {
      console.log(`✅ Active Patient Session: ${session.patient_display_name}`)
    }
  }

  console.log('\n🎉 Production Seed Finished Successfully!')
  console.log('----------------------------------------------------')
  console.log('Doctor Login:      dr.sharma@apollo.health  / Ishara2026!')
  console.log('Doctor Login 2:    dr.verma@apollo.health   / Ishara2026!')
  console.log('Interpreter Login: ananya.isl@relay.org     / Ishara2026!')
  console.log('Bedside Tablet:    Sign in as staff, select a bed, and generate a pairing QR code.')
  console.log('----------------------------------------------------')
}

seed().catch((error) => { console.error('Seed failed:', error); process.exitCode = 1 })
