import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../App'

const FILE_ICONS   = { pdf:'📕', jpg:'🖼️', jpeg:'🖼️', png:'🖼️', doc:'📘', docx:'📘' }
const STATUS_STYLE = {
  pending:  { bg:'var(--warning-light)', color:'var(--warning)',  label:'Pending'   },
  printing: { bg:'var(--accent-light)',  color:'var(--accent)',   label:'Printing…' },
  done:     { bg:'var(--success-light)', color:'var(--success)',  label:'Done ✓'    },
}

export default function OwnerDashboard() {
  const { user, logout } = useAuth()

  const [tab,        setTab]        = useState('queue')
  const [jobs,       setJobs]       = useState([])
  const [doneJobs,   setDoneJobs]   = useState([])
  const [stats,      setStats]      = useState({ pending:0, printing:0, done:0 })
  const [loading,    setLoading]    = useState(true)
  const [completing, setCompleting] = useState(null)

  // ── Fetch queue + stats ──────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const [q, s] = await Promise.all([
        axios.get('/api/queue/pending'),
        axios.get('/api/queue/stats')
      ])
      setJobs(q.data)
      setStats(s.data)
    } catch (err) {
      console.error('Failed to refresh', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 10000)  // auto-refresh every 10 seconds
    return () => clearInterval(t)
  }, [refresh])

  // ── Owner downloads decrypted file → prints it manually ─
  function download(job) {
    window.open(`/api/queue/download/${job.jobId}`, '_blank')
    setTimeout(refresh, 1500)
  }

  // ── Mark job as done after printing ─────────────────────
  async function markDone(job) {
    setCompleting(job.jobId)
    try {
      await axios.patch(`/api/queue/complete/${job.jobId}`)
      await refresh()
    } catch {
      alert('Failed to mark as complete')
    } finally {
      setCompleting(null)
    }
  }

  async function loadDone() {
    const res = await axios.get('/api/queue/completed')
    setDoneJobs(res.data)
  }

  // ── Helpers ──────────────────────────────────────────────
  const fmtSize = b => b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`
  const fmtTime = iso => {
    const m = Math.floor((Date.now() - new Date(iso)) / 60000)
    return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.floor(m/60)}h ago`
  }
  const fileIcon = name => FILE_ICONS[(name?.split('.').pop() || '').toLowerCase()] || '📄'
  const fmtOpts  = o => {
    if (!o) return ''
    return [
      o.copies > 1 ? `${o.copies} copies` : '1 copy',
      o.color === 'bw' ? 'B&W' : 'Color',
      o.orientation === 'portrait' ? 'Portrait' : 'Landscape',
      o.sides === 'double' ? 'Double sided' : 'Single sided',
    ].join(' · ')
  }

  return (
    <div style={s.layout}>
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside style={s.sidebar}>
        <div style={s.sideTop}>
          <span style={s.logo}>PrintDrop</span>
          <span style={s.ownerTag}>Owner</span>
        </div>

        <nav style={s.nav}>
          {[
            { id:'queue', icon:'🖨️', label:'Print Queue'   },
            { id:'done',  icon:'✓',  label:'Completed'     },
          ].map(item => (
            <button
              key={item.id}
              style={{ ...s.navBtn, ...(tab === item.id ? s.navActive : {}) }}
              onClick={() => { setTab(item.id); if (item.id === 'done') loadDone() }}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div style={s.sideBottom}>
          <div style={s.ownerRow}>
            <div style={s.ownerAvatar}>
              {user.avatar
                ? <img src={user.avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
                : user.name[0]
              }
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>{user.name}</div>
              <div style={{ fontSize:11, color:'var(--muted)' }}>Shop owner</div>
            </div>
          </div>
          <button onClick={logout} style={s.logoutBtn}>Sign out</button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────── */}
      <main style={s.main}>

        {/* Stats bar */}
        <div style={s.statsRow}>
          {[
            { label:'Pending',    value:stats.pending,  color:'var(--warning)' },
            { label:'Printing',   value:stats.printing, color:'var(--accent)'  },
            { label:'Completed',  value:stats.done,     color:'var(--success)' },
          ].map(st => (
            <div key={st.label} style={s.statCard}>
              <div style={{ ...s.statNum, color:st.color }}>{st.value}</div>
              <div style={s.statLabel}>{st.label}</div>
            </div>
          ))}
          <button onClick={refresh} style={s.refreshBtn}>↻ Refresh</button>
        </div>

        {/* ── Queue tab ──────────────────────────────────── */}
        {tab === 'queue' && (
          <>
            <div style={s.pageTitle}>
              Print Queue
              {jobs.length > 0 && <span style={s.countBadge}>{jobs.length}</span>}
            </div>

            {loading ? (
              <div style={s.empty}>
                <div className="spinner spinner-dark" style={{ width:28, height:28, marginBottom:12 }} />
                Loading queue…
              </div>
            ) : jobs.length === 0 ? (
              <div style={s.empty}>
                <div style={{ fontSize:44, marginBottom:14 }}>🎉</div>
                <strong>Queue is empty</strong>
                <span style={{ color:'var(--muted)', fontSize:14, marginTop:4 }}>All caught up! New jobs appear automatically.</span>
              </div>
            ) : (
              <div style={s.jobList}>
                {jobs.map((job, i) => (
                  <div key={job.jobId} style={s.jobCard} className="fade-up">

                    <div style={s.jobTop}>
                      <div style={s.jobLeft}>
                        <span style={s.qNum}>#{i+1}</span>
                        <div>
                          <div style={s.jobName}>{fileIcon(job.originalName)} {job.originalName}</div>
                          <div style={s.jobUser}>
                            <strong>{job.userName}</strong>
                            <code style={s.uid}>{job.userUniqueId?.slice(0,8).toUpperCase()}</code>
                          </div>
                        </div>
                      </div>
                      <span style={{ ...s.pill, background:STATUS_STYLE[job.status].bg, color:STATUS_STYLE[job.status].color }}>
                        {STATUS_STYLE[job.status].label}
                      </span>
                    </div>

                    <div style={s.jobMeta}>
                      <span>{fmtOpts(job.printOptions)}</span>
                      <span style={{ color:'var(--muted)' }}>{fmtSize(job.fileSize)} · {fmtTime(job.uploadedAt)}</span>
                    </div>

                    <div style={s.jobActions}>
                      <button onClick={() => download(job)} style={s.dlBtn}>
                        ↓ Download &amp; Print
                      </button>
                      <button
                        onClick={() => markDone(job)}
                        disabled={completing === job.jobId}
                        style={{ ...s.doneBtn, ...(completing === job.jobId ? { opacity:0.5 } : {}) }}
                      >
                        {completing === job.jobId ? '…' : '✓ Mark as printed'}
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Completed tab ──────────────────────────────── */}
        {tab === 'done' && (
          <>
            <div style={s.pageTitle}>Completed Jobs</div>
            {doneJobs.length === 0
              ? <div style={s.empty}><span style={{ color:'var(--muted)' }}>No completed jobs yet.</span></div>
              : (
                <div style={s.jobList}>
                  {doneJobs.map(job => (
                    <div key={job.jobId} style={{ ...s.jobCard, opacity:0.75 }}>
                      <div style={s.jobTop}>
                        <div style={s.jobLeft}>
                          <div>
                            <div style={s.jobName}>{fileIcon(job.originalName)} {job.originalName}</div>
                            <div style={s.jobUser}>
                              <strong>{job.userName}</strong>
                              <code style={s.uid}>{job.userUniqueId?.slice(0,8).toUpperCase()}</code>
                            </div>
                          </div>
                        </div>
                        <span style={{ ...s.pill, background:'var(--success-light)', color:'var(--success)' }}>Done ✓</span>
                      </div>
                      <div style={s.jobMeta}>
                        <span>{fmtOpts(job.printOptions)}</span>
                        <span style={{ color:'var(--muted)' }}>Completed {fmtTime(job.completedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </>
        )}

      </main>
    </div>
  )
}

const s = {
  layout:     { display:'flex', minHeight:'100vh', background:'var(--paper)' },
  sidebar:    { width:220, background:'var(--white)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', padding:'22px 14px', position:'sticky', top:0, height:'100vh', flexShrink:0 },
  sideTop:    { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:30 },
  logo:       { fontFamily:'var(--font-display)', fontSize:18, fontWeight:800 },
  ownerTag:   { fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', background:'var(--accent)', color:'#fff', padding:'3px 8px', borderRadius:100 },
  nav:        { display:'flex', flexDirection:'column', gap:3, flex:1 },
  navBtn:     { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:'var(--radius-sm)', background:'none', border:'none', fontSize:14, fontWeight:500, color:'var(--muted)', textAlign:'left', transition:'all 0.15s' },
  navActive:  { background:'var(--paper)', color:'var(--ink)' },
  sideBottom: { borderTop:'1px solid var(--border)', paddingTop:14, display:'flex', flexDirection:'column', gap:12 },
  ownerRow:   { display:'flex', alignItems:'center', gap:10 },
  ownerAvatar:{ width:34, height:34, borderRadius:'50%', background:'var(--accent)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, overflow:'hidden', flexShrink:0 },
  logoutBtn:  { background:'none', border:'1px solid var(--border)', borderRadius:100, padding:7, fontSize:12, color:'var(--muted)', width:'100%' },
  main:       { flex:1, padding:'28px 36px', overflowY:'auto' },
  statsRow:   { display:'flex', gap:14, marginBottom:28, alignItems:'center', flexWrap:'wrap' },
  statCard:   { background:'var(--white)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 22px', boxShadow:'var(--shadow)' },
  statNum:    { fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, lineHeight:1 },
  statLabel:  { fontSize:12, color:'var(--muted)', marginTop:3 },
  refreshBtn: { marginLeft:'auto', background:'none', border:'1px solid var(--border)', borderRadius:100, padding:'8px 16px', fontSize:13, color:'var(--muted)' },
  pageTitle:  { fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, letterSpacing:'-0.5px', marginBottom:18, display:'flex', alignItems:'center', gap:12 },
  countBadge: { background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:700, padding:'2px 10px', borderRadius:100 },
  empty:      { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'72px 24px', gap:4 },
  jobList:    { display:'flex', flexDirection:'column', gap:14 },
  jobCard:    { background:'var(--white)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'18px 22px', boxShadow:'var(--shadow)' },
  jobTop:     { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 },
  jobLeft:    { display:'flex', alignItems:'flex-start', gap:14 },
  qNum:       { fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:'var(--accent)', lineHeight:1, marginTop:2 },
  jobName:    { fontWeight:600, fontSize:15, marginBottom:4 },
  jobUser:    { display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--muted)' },
  uid:        { fontSize:11, background:'var(--paper)', padding:'1px 6px', borderRadius:4 },
  pill:       { fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:100, flexShrink:0 },
  jobMeta:    { fontSize:13, color:'var(--muted)', display:'flex', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:4 },
  jobActions: { display:'flex', gap:10 },
  dlBtn:      { flex:1, padding:'9px 16px', background:'var(--ink)', color:'#fff', borderRadius:100, fontSize:13, fontWeight:600 },
  doneBtn:    { flex:1, padding:'9px 16px', background:'var(--success-light)', color:'var(--success)', borderRadius:100, fontSize:13, fontWeight:600 },
}
