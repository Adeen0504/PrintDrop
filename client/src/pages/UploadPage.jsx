import { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../App'

const ACCEPTED   = '.pdf,.jpg,.jpeg,.png,.doc,.docx'
const MAX_MB     = 20
const FILE_ICONS = { pdf:'📕', jpg:'🖼️', jpeg:'🖼️', png:'🖼️', doc:'📘', docx:'📘' }

export default function UploadPage() {
  const { user, logout } = useAuth()
  const inputRef = useRef()

  const [file,     setFile]     = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [opts,     setOpts]     = useState({ copies:1, color:'bw', orientation:'portrait', sides:'single' })
  const [state,    setState]    = useState('idle')  // idle | uploading | success | error
  const [result,   setResult]   = useState(null)
  const [jobs,     setJobs]     = useState([])
  const [showJobs, setShowJobs] = useState(false)

  // ── File selection ───────────────────────────────────────
  const pickFile = useCallback(e => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer?.files[0] || e.target.files[0]
    if (!f) return
    if (f.size > MAX_MB * 1024 * 1024) { alert(`Max file size is ${MAX_MB} MB`); return }
    setFile(f)
    setState('idle')
    setResult(null)
  }, [])

  // ── Submit ───────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return
    setState('uploading')

    const form = new FormData()
    form.append('file', file)
    Object.entries(opts).forEach(([k, v]) => form.append(k, v))

    try {
      const res = await axios.post('/api/upload', form)
      setResult(res.data)
      setState('success')
      setFile(null)
    } catch (err) {
      setState('error')
      setResult({ error: err.response?.data?.error || 'Upload failed. Please try again.' })
    }
  }

  // ── Load job history ─────────────────────────────────────
  async function loadJobs() {
    const res = await axios.get('/api/upload/my-jobs')
    setJobs(res.data)
    setShowJobs(true)
  }

  // ── Helpers ──────────────────────────────────────────────
  const fmtSize = b => b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`
  const fmtTime = iso => {
    const m = Math.floor((Date.now() - new Date(iso)) / 60000)
    return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.floor(m/60)}h ago`
  }
  const fileExt  = name => (name.split('.').pop() || '').toLowerCase()
  const fileIcon = name => FILE_ICONS[fileExt(name)] || '📄'

  const STATUS_COLOR = { pending:'var(--warning)', printing:'var(--accent)', done:'var(--success)' }
  const STATUS_LABEL = { pending:'In queue', printing:'Printing…', done:'Printed ✓' }

  const opt = (key, val) => setOpts(o => ({ ...o, [key]: val }))

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <a href="/" style={s.logo}>PrintDrop</a>
        <div style={s.headerRight}>
          <button onClick={loadJobs}  style={s.ghost}>My jobs</button>
          <div style={s.avatar}>
            {user.avatar
              ? <img src={user.avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
              : user.name[0].toUpperCase()
            }
          </div>
          <button onClick={logout} style={s.ghost}>Sign out</button>
        </div>
      </header>

      <main style={s.main}>
        {/* Upload card */}
        <div style={s.card} className="fade-up">

          {/* Greeting row */}
          <div style={s.greeting}>
            <div>
              <h1 style={s.title}>Hi, {user.name.split(' ')[0]} 👋</h1>
              <p style={s.subtitle}>Upload a document to get a printout</p>
            </div>
            <div style={s.idBox}>
              <span style={s.idLabel}>YOUR ID</span>
              <span style={s.idValue}>{user.uniqueId?.slice(0,8).toUpperCase()}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Drop zone */}
            <div
              style={{ ...s.dropzone, ...(dragOver ? s.dropzoneOver : {}), ...(file ? s.dropzoneFile : {}) }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={pickFile}
              onClick={() => !file && inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept={ACCEPTED} style={{ display:'none' }} onChange={pickFile} />

              {!file ? (
                <div style={s.dropHint}>
                  <div style={{ fontSize:38, marginBottom:8 }}>📄</div>
                  <div style={{ fontWeight:600, fontSize:16, marginBottom:4 }}>Drop your file here</div>
                  <div style={{ color:'var(--muted)', fontSize:13 }}>or click to browse</div>
                  <div style={{ color:'var(--muted)', fontSize:12, marginTop:8 }}>PDF · JPG · PNG · DOC · DOCX &nbsp;·&nbsp; max {MAX_MB} MB</div>
                </div>
              ) : (
                <div style={s.fileRow}>
                  <span style={{ fontSize:28 }}>{fileIcon(file.name)}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:500, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.name}</div>
                    <div style={{ fontSize:12, color:'var(--muted)' }}>{fmtSize(file.size)}</div>
                  </div>
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }} style={s.removeBtn}>✕</button>
                </div>
              )}
            </div>

            {/* Print options */}
            <div style={s.optGrid}>
              {/* Copies counter */}
              <div style={s.optRow}>
                <span style={s.optLabel}>Copies</span>
                <div style={s.counter}>
                  <button type="button" style={s.countBtn} onClick={() => opt('copies', Math.max(1, opts.copies - 1))}>−</button>
                  <span style={s.countNum}>{opts.copies}</span>
                  <button type="button" style={s.countBtn} onClick={() => opt('copies', Math.min(50, opts.copies + 1))}>+</button>
                </div>
              </div>

              {/* Toggle groups */}
              {[
                { key:'color',       label:'Color',       choices:[['bw','Black & White'],['color','Color']] },
                { key:'orientation', label:'Orientation', choices:[['portrait','Portrait'],['landscape','Landscape']] },
                { key:'sides',       label:'Sides',       choices:[['single','Single sided'],['double','Double sided']] },
              ].map(({ key, label, choices }) => (
                <div key={key} style={s.optRow}>
                  <span style={s.optLabel}>{label}</span>
                  <div style={s.toggleGroup}>
                    {choices.map(([val, lbl]) => (
                      <button
                        key={val}
                        type="button"
                        style={{ ...s.toggleBtn, ...(opts[key] === val ? s.toggleActive : {}) }}
                        onClick={() => opt(key, val)}
                      >{lbl}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!file || state === 'uploading'}
              style={{ ...s.submitBtn, ...(!file || state === 'uploading' ? s.submitDisabled : {}) }}
            >
              {state === 'uploading'
                ? <><div className="spinner" /> Uploading…</>
                : '🖨️  Send to print queue'
              }
            </button>
          </form>

          {/* Result messages */}
          {state === 'success' && result && (
            <div style={{ ...s.toast, background:'var(--success-light)', borderColor:'var(--success)' }}>
              <strong style={{ color:'var(--success)' }}>✓ Added to queue — position #{result.position}</strong>
              <p style={{ fontSize:13, color:'var(--success)', marginTop:3 }}>{result.message}</p>
            </div>
          )}
          {state === 'error' && result && (
            <div style={{ ...s.toast, background:'#fce8e8', borderColor:'#c0392b' }}>
              <strong style={{ color:'#c0392b' }}>✗ {result.error}</strong>
            </div>
          )}
        </div>

        {/* Job history panel */}
        {showJobs && (
          <div style={s.jobsCard} className="fade-up">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>My print jobs</h2>
              <button onClick={() => setShowJobs(false)} style={s.removeBtn}>✕</button>
            </div>
            {jobs.length === 0
              ? <p style={{ color:'var(--muted)', fontSize:14 }}>No jobs yet.</p>
              : jobs.map(j => (
                <div key={j.jobId} style={s.jobRow}>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                    {fileIcon(j.originalName)} {j.originalName}
                  </span>
                  <span style={{ fontWeight:600, fontSize:12, color:STATUS_COLOR[j.status], flexShrink:0 }}>
                    {STATUS_LABEL[j.status]}
                  </span>
                  <span style={{ fontSize:12, color:'var(--muted)', flexShrink:0 }}>{fmtTime(j.uploadedAt)}</span>
                </div>
              ))
            }
          </div>
        )}
      </main>
    </div>
  )
}

const s = {
  page:         { minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--paper)' },
  header:       { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 32px', background:'var(--white)', borderBottom:'1px solid var(--border)' },
  logo:         { fontFamily:'var(--font-display)', fontSize:20, fontWeight:800 },
  headerRight:  { display:'flex', alignItems:'center', gap:12 },
  ghost:        { background:'none', border:'1px solid var(--border)', borderRadius:100, padding:'6px 14px', fontSize:13, color:'var(--muted)' },
  avatar:       { width:32, height:32, borderRadius:'50%', background:'var(--accent)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, overflow:'hidden' },
  main:         { flex:1, display:'flex', gap:24, padding:'36px 24px', justifyContent:'center', flexWrap:'wrap', alignItems:'flex-start' },
  card:         { background:'var(--white)', borderRadius:20, padding:32, boxShadow:'var(--shadow-lg)', width:'100%', maxWidth:520, border:'1px solid var(--border)' },
  greeting:     { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 },
  title:        { fontSize:24, fontWeight:800, letterSpacing:'-0.5px', marginBottom:4 },
  subtitle:     { color:'var(--muted)', fontSize:14 },
  idBox:        { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 },
  idLabel:      { fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--muted)' },
  idValue:      { fontFamily:'monospace', fontSize:13, fontWeight:700, color:'var(--accent)', background:'var(--accent-light)', padding:'2px 8px', borderRadius:6 },
  dropzone:     { border:'2px dashed var(--border)', borderRadius:'var(--radius)', padding:'36px 24px', textAlign:'center', cursor:'pointer', transition:'all 0.2s', marginBottom:22, background:'var(--paper)' },
  dropzoneOver: { borderColor:'var(--accent)', background:'#fff8f6' },
  dropzoneFile: { cursor:'default', border:'2px solid var(--border)', background:'var(--white)' },
  dropHint:     { display:'flex', flexDirection:'column', alignItems:'center' },
  fileRow:      { display:'flex', alignItems:'center', gap:12 },
  removeBtn:    { background:'none', border:'1px solid var(--border)', borderRadius:'50%', width:28, height:28, cursor:'pointer', color:'var(--muted)', flexShrink:0, fontSize:12 },
  optGrid:      { display:'flex', flexDirection:'column', gap:14, marginBottom:22 },
  optRow:       { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 },
  optLabel:     { fontSize:14, fontWeight:500, minWidth:88 },
  counter:      { display:'flex', alignItems:'center', gap:10, background:'var(--paper)', border:'1px solid var(--border)', borderRadius:100, padding:'3px 8px' },
  countBtn:     { background:'none', border:'none', fontSize:18, cursor:'pointer', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%' },
  countNum:     { fontWeight:700, fontSize:16, minWidth:24, textAlign:'center' },
  toggleGroup:  { display:'flex', gap:7 },
  toggleBtn:    { padding:'7px 13px', borderRadius:100, border:'1.5px solid var(--border)', background:'var(--white)', fontSize:13, color:'var(--muted)', transition:'all 0.15s' },
  toggleActive: { background:'var(--ink)', color:'#fff', borderColor:'var(--ink)', fontWeight:500 },
  submitBtn:    { width:'100%', padding:14, background:'var(--accent)', color:'#fff', borderRadius:100, fontSize:15, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.2s' },
  submitDisabled:{ opacity:0.5, cursor:'not-allowed' },
  toast:        { marginTop:16, padding:'12px 16px', borderRadius:'var(--radius-sm)', border:'1px solid' },
  jobsCard:     { background:'var(--white)', borderRadius:20, padding:28, boxShadow:'var(--shadow-lg)', width:'100%', maxWidth:380, border:'1px solid var(--border)', maxHeight:460, overflowY:'auto' },
  jobRow:       { display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid var(--border)', fontSize:13 },
}
