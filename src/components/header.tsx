import "./header.css"
import { useState } from "react"

export default function header(props: {
  logined: boolean,
  openLoginForm: React.EventHandler<React.MouseEvent<HTMLElement>>,
  onShareUrl?: () => void
}) {
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState("")

  const handleShareUrl = () => {
    const url = window.location.href
    setShareUrl(url)
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