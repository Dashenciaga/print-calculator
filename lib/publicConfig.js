// Supabase-ийн НИЙТИЙН тохиргоо. Эдгээр нь нууц биш: хөтөч рүү очдог, хамгаалалтыг
// өгөгдлийн сангийн RLS хийдэг. Нууц түлхүүр (SUPABASE_SERVICE_ROLE_KEY) энд
// ХЭЗЭЭ Ч орохгүй.
//
// Vercel дээрх хуучин NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY нь
// ажиллахаа больсон өгөгдлийн сан руу заадаг бөгөөд «Secret» төрөлтэй тул засагдахгүй.
// Иймээс тэдгээрийг уншихгүй. Өөр төсөл рүү шилжүүлэх бол доорх шинэ нэрээр тохируулна.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_PRINTCALC_SUPABASE_URL || 'https://bgxoyvommdzeljcdgqyj.supabase.co'

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_PRINTCALC_SUPABASE_KEY || 'sb_publishable_npzzcmXkvqopTfTtSzT0JA_AQjATK6t'
