import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // If already logged in, skip landing
  useEffect(() => {
    if (!loading && user) navigate(user.isOwner ? '/owner' : '/upload')
  }, [user, loading])

  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <span style={s.logo}>PrintDrop</span>
        <a href="/auth/google" style={s.signInBtn}>Sign in</a>
      </nav>

      {/* Hero */}
      <main style={s.hero}>
        <div style={s.badge} className="fade-up">Xerox, simplified</div>

        <h1 style={s.headline} className="fade-up">
          Drop your file.<br />Pick up your print.
        </h1>

        <p style={s.sub} className="fade-up">
          No saving contacts. No WhatsApp hassle.<br />
          Upload your document, fill in the details, done.
        </p>

        <a href="/auth/google" style={s.cta} className="fade-up">
          <GoogleIcon />
          Continue with Google
        </a>

        {/* How it works */}
        <div style={s.steps} className="fade-up">
          {[
            { n: '01', title: 'Scan QR at shop',    desc: 'Or visit the site directly'      },
            { n: '02', title: 'Upload document',     desc: 'PDF, image, Word — any format'   },
            { n: '03', title: 'Pick up printout',    desc: 'Get notified when it\'s ready'   },
          ].map(step => (
            <div key={step.n} style={s.step}>
              <span style={s.stepNum}>{step.n}</span>
              <div>
                <div style={s.stepTitle}>{step.title}</div>
                <div style={s.stepDesc}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={s.footer}>
        <span>© 2025 PrintDrop</span>
        <span style={{ color: 'var(--muted)' }}>Files encrypted · Deleted within 24 hours</span>
      </footer>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

const s = {
  page:      { minHeight:'100vh', display:'flex', flexDirection:'column' },
  nav:       { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 40px' },
  logo:      { fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, letterSpacing:'-0.5px' },
  signInBtn: { padding:'8px 20px', border:'1.5px solid var(--ink)', borderRadius:100, fontSize:14, fontWeight:500 },
  hero:      { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 24px', gap:0 },
  badge:     { background:'var(--accent)', color:'#fff', fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', padding:'5px 14px', borderRadius:100, marginBottom:28 },
  headline:  { fontFamily:'var(--font-display)', fontSize:'clamp(40px,7vw,78px)', fontWeight:800, letterSpacing:'-2px', lineHeight:1.05, textAlign:'center', marginBottom:22, maxWidth:680 },
  sub:       { fontSize:17, color:'var(--muted)', textAlign:'center', lineHeight:1.75, marginBottom:36, fontWeight:300 },
  cta:       { display:'inline-flex', alignItems:'center', gap:10, background:'var(--ink)', color:'#fff', padding:'13px 28px', borderRadius:100, fontSize:15, fontWeight:500, marginBottom:60, boxShadow:'0 4px 20px rgba(15,15,15,0.18)' },
  steps:     { display:'flex', gap:14, flexWrap:'wrap', justifyContent:'center', maxWidth:660 },
  step:      { display:'flex', alignItems:'flex-start', gap:14, background:'var(--white)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'18px 22px', width:200, boxShadow:'var(--shadow)' },
  stepNum:   { fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'var(--accent)', flexShrink:0, marginTop:1 },
  stepTitle: { fontWeight:600, fontSize:14, marginBottom:3 },
  stepDesc:  { fontSize:12, color:'var(--muted)' },
  footer:    { display:'flex', justifyContent:'space-between', padding:'18px 40px', fontSize:13, borderTop:'1px solid var(--border)' },
}
