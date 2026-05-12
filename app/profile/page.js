'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeSection, setActiveSection] = useState('company')
  const [form, setForm] = useState({
    company_name: '', phone: '', address: '', website: '',
    contact_name: '', contact_email: '',
    register_number: '', bank_name: '', bank_account: '',
    default_vat: 10, default_overhead: 15, default_print_cost: 80,
    logo_url: '',
  })
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (prof) {
        setForm({
          company_name: prof.company_name || '',
          phone: prof.phone || '',
          address: prof.address || '',
          website: prof.website || '',
          contact_name: prof.contact_name || '',
          contact_email: prof.contact_email || '',
          register_number: prof.register_number || '',
          bank_name: prof.bank_name || '',
          bank_account: prof.bank_account || '',
          default_vat: prof.default_vat ?? 10,
          default_overhead: prof.default_overhead ?? 15,
          default_print_cost: prof.default_print_cost ?? 80,
          logo_url: prof.logo_url || '',
        })
        setIsNew(false)
      } else {
        setIsNew(true)
      }
    }
    init()
  }, [])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function compressImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let { width, height } = img
          const MAX_DIM = 800
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round(height * MAX_DIM / width)
              width = MAX_DIM
            } else {
              width = Math.round(width * MAX_DIM / height)
              height = MAX_DIM
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file || !user) return
    if (file.size > 10 * 1024 * 1024) {
      alert('Файл хэт том байна. 10MB-аас бага файл сонгоно уу.')
      return
    }
    setUploading(true)
    try {
      const supabase = createClient()
      const compressed = await compressImage(file)
      const filePath = user.id + '/logo.jpg'
      const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, compressed, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) {
        alert('Лого хуулахад алдаа гарлаа: ' + uploadError.message)
        return
      }
      const { data } = supabase.storage.from('logos').getPublicUrl(filePath)
      const logoUrl = data.publicUrl + '?t=' + Date.now()
      set('logo_url', logoUrl)
      await supabase.from('profiles').update({ logo_url: logoUrl }).eq('user_id', user.id)
    } catch (err) {
      alert('Алдаа: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const data = { ...form, user_id: user.id, email: user.email }
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
    page: { minHeight: '100vh', background: '#f4f5f7', fontFamily: 'system-ui,-apple-system,sans-serif' },
    topbar: { background: 'white', borderBottom: '0.5px solid #e2e8f0', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 },
    tbLeft: { display: 'flex', alignItems: 'center', gap: 10 },
    tbIcon: { width: 28, height: 28, background: '#4f46e5', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    tbName: { fontSize: 14, fontWeight: 600, color: '#1a1f36' },
    tbBack: { padding: '6px 14px', background: 'transparent', border: '0.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, color: '#64748b', cursor: 'pointer' },
    content: { maxWidth: 640, margin: '0 auto', padding: '28px 24px' },
    heading: { fontSize: 22, fontWeight: 700, color: '#1a1f36', letterSpacing: '-.4px', marginBottom: 4 },
    subheading: { fontSize: 14, color: '#64748b', marginBottom: 24 },
    tabs: { display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 8, padding: 3, marginBottom: 20 },
    tab: { flex: 1, padding: '7px', fontSize: 12, borderRadius: 6, color: '#64748b', cursor: 'pointer', border: 'none', background: 'none', fontWeight: 500, textAlign: 'center' },
    tabActive: { background: 'white', color: '#1a1f36', fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,.08)' },
    card: { background: 'white', borderRadius: 12, border: '0.5px solid #e2e8f0', padding: '20px', marginBottom: 12 },
    cardTitle: { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    grid1: { display: 'grid', gridTemplateColumns: '1fr', gap: 12 },
    field: { display: 'flex', flexDirection: 'column', gap: 5 },
    label: { fontSize: 12, fontWeight: 500, color: '#374151' },
    input: { padding: '9px 12px', fontSize: 14, border: '1.5px solid #e2e8f0', borderRadius: 9, background: 'white', color: '#1a1f36', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s', width: '100%' },
    emailBox: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', background: '#f8f9fb', borderRadius: 10, marginBottom: 20, border: '0.5px solid #e2e8f0' },
    emailLabel: { fontSize: 11, color: '#94a3b8' },
    emailVal: { fontSize: 13, color: '#1a1f36', fontWeight: 500 },
    saveBtn: { width: '100%', padding: '12px', background: saved ? '#10b981' : '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'background .2s', marginTop: 8 },
    skipBtn: { width: '100%', padding: '10px', background: 'transparent', color: '#94a3b8', border: 'none', fontSize: 13, cursor: 'pointer', marginTop: 8 },
    hint: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
    logoBox: { display: 'flex', alignItems: 'center', gap: 14, padding: '12px', background: '#f8f9fb', borderRadius: 10, border: '0.5px solid #e2e8f0', marginBottom: 12 },
    uploadBtn: { padding: '7px 14px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  }

  const sections = [
    { id: 'company', label: 'Компани' },
    { id: 'contact', label: 'Холбоо барих' },
    { id: 'finance', label: 'Санхүү' },
    { id: 'defaults', label: 'Анхны утга' },
  ]

  const focusStyle = e => e.target.style.borderColor = '#4f46e5'
  const blurStyle = e => e.target.style.borderColor = '#e2e8f0'

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <div style={s.tbLeft}>
          <div style={s.tbIcon}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <rect x="2" y="3" width="20" height="18" rx="2" /><path d="M8 7h8M8 12h5" />
            </svg>
          </div>
          <span style={s.tbName}>PrintCalc Pro</span>
        </div>
        <button style={s.tbBack} onClick={() => router.push('/dashboard')}>← Буцах</button>
      </div>

      <div style={s.content}>
        <div style={s.heading}>{isNew ? 'Компанийн мэдээлэл' : 'Профайл'}</div>
        <div style={s.subheading}>{isNew ? 'Эхлэхийн тулд мэдээллээ оруулна уу' : 'Компанийн мэдээллээ шинэчилнэ үү'}</div>

        {user && (
          <div style={s.emailBox}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <div>
              <div style={s.emailLabel}>Бүртгэлийн и-мэйл</div>
              <div style={s.emailVal}>{user.email}</div>
            </div>
          </div>
        )}

        <div style={s.tabs}>
          {sections.map(sec => (
            <button key={sec.id}
              style={{ ...s.tab, ...(activeSection === sec.id ? s.tabActive : {}) }}
              onClick={() => setActiveSection(sec.id)}>
              {sec.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave}>
          {activeSection === 'company' && (
            <div style={s.card}>
              <div style={s.cardTitle}>Компанийн мэдээлэл</div>
              <div style={{ ...s.field, marginBottom: 16 }}>
                <label style={s.label}>Компанийн лого</label>
                <div style={s.logoBox}>
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="logo" style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, border: '0.5px solid #e2e8f0', background: 'white' }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: 8, border: '1.5px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', color: '#94a3b8', fontSize: 20 }}>
                      🏢
                    </div>
                  )}
                  <div>
                    <label htmlFor="logo-input" style={{ ...s.uploadBtn, display: 'inline-block', cursor: 'pointer' }}>
                      {uploading ? 'Хуулж байна...' : form.logo_url ? 'Солих' : 'Лого оруулах'}
                    </label>
                    <input id="logo-input" type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} disabled={uploading} />
                    <div style={s.hint}>PNG, JPG — дээд тал 10MB (автомат жижигрүүлнэ)</div>
                  </div>
                </div>
              </div>
              <div style={{ ...s.grid1, marginBottom: 12 }}>
                <div style={s.field}>
                  <label style={s.label}>Компанийн нэр *</label>
                  <input style={s.input} placeholder="Манай Хэвлэл ХХК" value={form.company_name}
                    onChange={e => set('company_name', e.target.value)} required onFocus={focusStyle} onBlur={blurStyle} />
                </div>
              </div>
              <div style={{ ...s.grid2, marginBottom: 12 }}>
                <div style={s.field}>
                  <label style={s.label}>Регистрийн дугаар</label>
                  <input style={s.input} placeholder="1234567" value={form.register_number}
                    onChange={e => set('register_number', e.target.value)} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Утасны дугаар</label>
                  <input style={s.input} placeholder="+976 9900 0000" value={form.phone}
                    onChange={e => set('phone', e.target.value)} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
              </div>
              <div style={{ ...s.grid1, marginBottom: 12 }}>
                <div style={s.field}>
                  <label style={s.label}>Хаяг</label>
                  <input style={s.input} placeholder="Улаанбаатар хот, ..." value={form.address}
                    onChange={e => set('address', e.target.value)} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
              </div>
              <div style={s.grid1}>
                <div style={s.field}>
                  <label style={s.label}>Вэбсайт</label>
                  <input style={s.input} placeholder="www.company.mn" value={form.website}
                    onChange={e => set('website', e.target.value)} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'contact' && (
            <div style={s.card}>
              <div style={s.cardTitle}>Холбоо барих мэдээлэл</div>
              <div style={{ ...s.grid2, marginBottom: 12 }}>
                <div style={s.field}>
                  <label style={s.label}>Холбоо барих хүний нэр</label>
                  <input style={s.input} placeholder="Бат Болд" value={form.contact_name}
                    onChange={e => set('contact_name', e.target.value)} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Холбоо барих и-мэйл</label>
                  <input style={s.input} type="email" placeholder="contact@company.mn" value={form.contact_email}
                    onChange={e => set('contact_email', e.target.value)} onFocus={focusStyle} onBlur={blurStyle} />
                  <span style={s.hint}>Үнийн санал дээр гарна</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'finance' && (
            <div style={s.card}>
              <div style={s.cardTitle}>Банкны мэдээлэл</div>
              <div style={{ ...s.grid2, marginBottom: 12 }}>
                <div style={s.field}>
                  <label style={s.label}>Банкны нэр</label>
                  <input style={s.input} placeholder="Хаан банк" value={form.bank_name}
                    onChange={e => set('bank_name', e.target.value)} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Дансны дугаар</label>
                  <input style={s.input} placeholder="5000123456" value={form.bank_account}
                    onChange={e => set('bank_account', e.target.value)} onFocus={focusStyle} onBlur={blurStyle} />
                  <span style={s.hint}>Үнийн санал дээр гарна</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'defaults' && (
            <div style={s.card}>
              <div style={s.cardTitle}>Тооцооны анхны утгууд</div>
              <div style={{ ...s.grid2, marginBottom: 12 }}>
                <div style={s.field}>
                  <label style={s.label}>НӨАТ (%)</label>
                  <input style={s.input} type="text" inputMode="numeric" value={form.default_vat}
                    onFocus={e => { e.target.select(); focusStyle(e) }} onBlur={blurStyle}
                    onChange={e => set('default_vat', +e.target.value || 0)} />
                  <span style={s.hint}>Тооцоо нээхэд автоматаар орно</span>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Нэмэгдэл (%)</label>
                  <input style={s.input} type="text" inputMode="numeric" value={form.default_overhead}
                    onFocus={e => { e.target.select(); focusStyle(e) }} onBlur={blurStyle}
                    onChange={e => set('default_overhead', +e.target.value || 0)} />
                  <span style={s.hint}>Тооцоо нээхэд автоматаар орно</span>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Хуудасны үнэ (₮)</label>
                  <input style={s.input} type="text" inputMode="numeric" value={form.default_print_cost}
                    onFocus={e => { e.target.select(); focusStyle(e) }} onBlur={blurStyle}
                    onChange={e => set('default_print_cost', +e.target.value || 0)} />
                  <span style={s.hint}>Тооцоо нээхэд автоматаар орно</span>
                </div>
              </div>
            </div>
          )}

          <button type="submit" style={s.saveBtn} disabled={loading}>
            {saved ? '✓ Хадгалагдлаа' : loading ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
          {isNew && (
            <button type="button" style={s.skipBtn} onClick={() => router.push('/dashboard')}>
              Дараа оруулна → алгасах
            </button>
          )}
        </form>
      </div>
    </div>
  )
}