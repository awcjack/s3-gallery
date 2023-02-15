import { Buffer } from "buffer"
import { S3Client } from "@aws-sdk/client-s3"
import { getObjectContent, S3Item, getPresignedDownloadUrl } from "../s3API"
import "./main.css"
import xMark from "../../assets/undraw_x-mark.svg"
import download from "../../assets/undraw_cloud-download.svg"
import person from "../../assets/undraw_person.svg"
import { useEffect, useState } from "react"

export default function preview(props: {
  s3Client: S3Client,
  bucket: string,
  object: S3Item,
  closePreview: React.EventHandler<React.MouseEvent<HTMLElement>>,
}) {
  const [data, setData] = useState<string>("")
  const [showShareModal, setShowShareModal] = useState(false)
  const [downloadExpiry, setDownloadExpiry] = useState(0)
  const [downloadLink, setDownloadLink] = useState("")

  useEffect(() => {
    (async () => {
      if (props.bucket && props.object.path) {
        const currentData = await getObjectContent(props.s3Client, props.bucket, props.object.path)
        if (currentData) {
          const imgSrc = "data:image/png;base64," + Buffer.from(currentData).toString("base64")
          if (data !== imgSrc) {
            setData(imgSrc)
          }
        }
      }
    })()
  })

  function onDownloadExpiryChange(e: React.FormEvent<HTMLInputElement>) {
    const expiry = parseInt(e.currentTarget.value)
    if (downloadExpiry !== expiry) {
      setDownloadExpiry(expiry)
    }
  }
    
  return (
    <div className="preview" onClick={(e) => props.closePreview(e)}>
      <div className="preview-header" onClick={(e) => e.stopPropagation()}>
        <div className="left">
          <img className="left" src={xMark} onClick={(e) => props.closePreview(e)} />
          <span className="name">{props.object.name}</span>
        </div>
        <div className="right">
          <img className="" src={download} onClick={async (e) => {
            const presignedUrl = await getPresignedDownloadUrl(props.s3Client, props.bucket, props.object.path || "", 300)
            const a = document.createElement("a")
            document.body.appendChild(a)
            a.setAttribute("style", "display: none")
            a.href = presignedUrl
            a.click();
          }}/>
          <img className="" src={person} onClick={(e) => setShowShareModal(true)}/>
        </div>
      </div>
      <div className="preview-content" onClick={(e) => e.stopPropagation()}>
        <img src={data} className="preview-content"></img>
      </div>
      {showShareModal ?
        <div className="modal-bg" onClick={(e) => {
          setShowShareModal(false)
          e.stopPropagation()
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const presignedUrl = await getPresignedDownloadUrl(props.s3Client, props.bucket, props.object.path || "", downloadExpiry)
              if (downloadLink != presignedUrl) {
                setDownloadLink(presignedUrl)
              }
            }
            }>
              Direct Download link expiry <br />
              <input type="radio" value="60" onChange={onDownloadExpiryChange} checked={downloadExpiry === 60} /> 1 min <br />
              <input type="radio" value="600" onChange={onDownloadExpiryChange} checked={downloadExpiry === 600} /> 10 mins <br />
              <input type="radio" value="3600" onChange={onDownloadExpiryChange} checked={downloadExpiry === 3600} /> 1 hour <br />
              <input type="radio" value="86400" onChange={onDownloadExpiryChange} checked={downloadExpiry === 86400} /> 1 day <br />
              <input type="radio" value="604800" onChange={onDownloadExpiryChange} checked={downloadExpiry === 604800} /> 7 days <br />
              <input type="radio" checked={downloadExpiry !== 0 && downloadExpiry !== 60 && downloadExpiry !== 600 && downloadExpiry !== 3600 && downloadExpiry !== 86400 && downloadExpiry !== 604800} /><input type="number" min="1" max="604800" onChange={onDownloadExpiryChange} /> Custom (seconds) <br />
              <button type="submit">Get Link</button>
              {downloadLink ? <div><input type="text" value={downloadLink} readOnly /><button onClick={(e) => navigator.clipboard.writeText(downloadLink)}>Copy to clipboard</button></div> : null}
            </form>
          </div>
        </div>
        : null}
    </div>
  )
}