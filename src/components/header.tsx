import "./header.css"
import { useState } from "react"

export default function header(props: {
  logined: boolean,
  openLoginForm: React.EventHandler<React.MouseEvent<HTMLElement>>,
  s3Token: {
    accessKey: string;
    secretKey: string;
    endpoint: string;
    region: string;
    bucket: string;
  },
  onShareUrl?: () => void
}) {
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState("")

  const handleShareUrl = () => {
    // Build share URL with all configuration
    const baseUrl = window.location.origin + window.location.pathname
    const params = new URLSearchParams()

    if (props.s3Token.accessKey) params.set('accessKey', props.s3Token.accessKey)
    if (props.s3Token.secretKey) params.set('secretKey', props.s3Token.secretKey)
    if (props.s3Token.endpoint) params.set('endpoint', props.s3Token.endpoint)
    if (props.s3Token.region) params.set('region', props.s3Token.region)
    if (props.s3Token.bucket) params.set('bucket', props.s3Token.bucket)

    const fullUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl
    setShareUrl(fullUrl)
    setShowShareModal(true)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
    alert("URL copied to clipboard!")
  }

  return (
    <div className="top-nav-bar">
      <div className="icon">
        <img src="/undraw_posting_photo_re_plk8.svg" />
        <a href="/">S3 Gallery</a>
      </div>
      <div className="login">
        <button onClick={handleShareUrl} style={{marginRight: '10px'}}>Share URL</button>
        {props.logined ? <div onClick={props.openLoginForm}>Logined, Switch User</div> : <button onClick={props.openLoginForm}>Login</button>}
      </div>
      {showShareModal && (
        <div className="modal-bg" onClick={() => setShowShareModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Share URL</h3>
            <p>Share this URL to give others access with the same configuration:</p>
            <input
              type="text"
              value={shareUrl}
              readOnly
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            <button onClick={copyToClipboard} style={{marginRight: '10px'}}>Copy to Clipboard</button>
            <button onClick={() => setShowShareModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}