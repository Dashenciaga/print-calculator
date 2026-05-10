'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [website, setWebsite] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (prof) {
        setCompanyName(prof.company_name || '')
        setPhone(prof.phone || '')
        setAddress(prof.address || '')
        setWebsite(prof.website || '')
      } else {
        setIsNew(true)
      }
    }
    init()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const data = { user_id: user.id, company_name: companyName, phone, address, email: user.email, website }
    if (isNew) {
      await supabase.from('profiles').insert(data)
      setIsNew(false)
    } else {
      await supabase.from('profiles').update(data).eq('user_id', user.id)
    }
    setLoading(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); router.push('/dashboard') }, 1500)
  }

  const s = {
    page: { minHeight:'100vh', background:'#f4f5f7', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:'system-ui,-apple-system,sans-serif' },
    card: { background:'white', borderRadius:16, border:'0.5px solid #e2e8f0', padding:'36px', width:'100%', maxWidth:480, boxShadow:'0 4px 24px rgba(0,0,0,.06)' },
    logoRow: { display:'flex', alignItems:'center', gap:10, marginBottom:28 },
    icon: { width:32, height:32, background:'#4f46e5', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' },
    iconName: { fontSize:15, fontWeight:700, color:'#1a1f36' },
    title: { fontSize:22, fontWeight:700, color:'#1a1f36', marginBottom:4, letterSpacing:'-.4px' },
    sub: { fontSize:14, color:'#64748b', marginBottom:28 },
    label: { display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:5 },
    input: { width:'100%', padding:'10px 13px', fontSize:14, border:'1.5px solid #e2e8f0', borderRadius:10, background:'white', color:'#1a1f36', outline:'none', boxSizing:'border-box', marginBottom:14, transition:'border-color .15s' },
    btn: { width:'100%', padding:'12px', background:'#4f46e5', color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:600, cursor:'pointer', transition:'background .15s' },
    btnSaved: { background:'#10b981' },
    skip: { textAlign:'center', marginTop:14, fontSize:13, color:'#94a3b8', cursor:'pointer' },
    divider: { height:'0.5px', background:'#f1f5f9', margin:'20px 0' },
    emailRow: { display:'flex', alignItems:'center', gap:8, padding:'10px 13px', background:'#f8f9fb', borderRadius:10, marginBottom:20 },
    emailLabel: { fontSize:12, color:'#94a3b8' },
    emailVal: { fontSize:13, color:'#1a1f36', fontWeight:500 },
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <div style={s.icon}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 7h8M8 12h5"/></svg>
          </div>
          <span style={s.iconName}>PrintCalc Pro</span>
        </div>

        <div style={s.title}>{isNew ? 'Компанийн мэдээлэл' : 'Профайл засах'}</div>
        <div style={s.sub}>{isNew ? 'Эхлэхийн тулд компанийнхаа мэдээллийг оруулна уу' : 'Компанийн мэдээллээ шинэчилнэ үү'}</div>

        {user && (
          <div style={s.emailRow}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <div>
              <div style={s.emailLabel}>И-мэйл хаяг</div>
              <div style={s.emailVal}>{user.email}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSave}>
          <label style={s.label}>Компанийн нэр *</label>
          <input style={s.input} placeholder="Манай Хэвлэл ХХК" value={companyName}
            onChange={e=>setCompanyName(e.target.value)} required
            onFocus={e=>e.target.style.borderColor='#4f46e5'}
            onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>

          <label style={s.label}>Утасны дугаар</label>
          <input style={s.input} placeholder="+976 9900 0000" value={phone}
            onChange={e=>setPhone(e.target.value)}
            onFocus={e=>e.target.style.borderColor='#4f46e5'}
            onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>

          <label style={s.label}>Хаяг</label>
          <input style={s.input} placeholder="Улаанбаатар хот, ..." value={address}
            onChange={e=>setAddress(e.target.value)}
            onFocus={e=>e.target.style.borderColor='#4f46e5'}
            onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>

          <label style={s.label}>Вэбсайт</label>
          <input style={s.input} placeholder="www.company.mn" value={website}
            onChange={e=>setWebsite(e.target.value)}
            onFocus={e=>e.target.style.borderColor='#4f46e5'}
            onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>

          <button type="submit" style={{...s.btn,...(saved?s.btnSaved:{})}} disabled={loading}>
            {saved ? '✓ Хадгалагдлаа' : loading ? 'Хадгалж байна...' : isNew ? 'Эхлэх →' : 'Хадгалах'}
          </button>
        </form>

        {isNew && (
          <div style={s.skip} onClick={()=>router.push('/dashboard')}>
            Дараа оруулна → алгасах
          </div>
        )}
      </div>
    </div>
  )
}