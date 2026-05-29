import { useSearchParams } from 'react-router-dom'

export default function LoginPage() {
  const [params] = useSearchParams()
  const failed   = params.get('error') === 'auth_failed'

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:20, padding:24 }}>
      <span style={{ fontSize:48 }}>😕</span>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:26 }}>Sign in failed</h2>
      {failed && (
        <p style={{ color:'var(--muted)', textAlign:'center' }}>
          Google authentication didn't go through. Please try again.
        </p>
      )}
      <a href="/auth/google" style={{ display:'inline-flex', alignItems:'center', gap:10, background:'var(--ink)', color:'#fff', padding:'12px 26px', borderRadius:100, fontSize:14, fontWeight:500 }}>
        Try again with Google
      </a>
      <a href="/" style={{ color:'var(--muted)', fontSize:14 }}>← Back to home</a>
    </div>
  )
}
