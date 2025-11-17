import { Buffer } from "buffer"
import { S3Client } from "@aws-sdk/client-s3"
import { getObjectContent, S3Item, getPresignedDownloadUrl } from "../s3API"
import "./main.css"
import xMark from "../../assets/undraw_x-mark.svg"
import download from "../../assets/undraw_cloud-download.svg"
import person from "../../assets/undraw_person.svg"
import { useEffect, useState } from "react"

interface CachedMedia {
  data: string;
  expiry: number;
}

// Default cache expiry: 24 hours
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000

function getCacheKey(bucket: string, path: string): string {
  return `s3-preview-cache:${bucket}:${path}`
}

function getFromCache(bucket: string, path: string): string | null {
  try {
    const cacheKey = getCacheKey(bucket, path)
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null

    const cachedMedia: CachedMedia = JSON.parse(cached)
    const now = Date.now()

    if (now > cachedMedia.expiry) {
      // Cache expired, remove it
      localStorage.removeItem(cacheKey)
      return null
    }

    return cachedMedia.data
  } catch (error) {
    console.error("Error reading from cache:", error)
    return null
  }
}

function saveToCache(bucket: string, path: string, data: string): void {
  try {
    const cacheKey = getCacheKey(bucket, path)
    const cachedMedia: CachedMedia = {
      data,
      expiry: Date.now() + CACHE_EXPIRY_MS
    }
    localStorage.setItem(cacheKey, JSON.stringify(cachedMedia))
  } catch (error) {
    console.error("Error saving to cache:", error)
    // If localStorage is full, try to clear old cache entries
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearExpiredCache()
      // Try again after clearing
      try {
        const cacheKey = getCacheKey(bucket, path)
        const cachedMedia: CachedMedia = {
          data,
          expiry: Date.now() + CACHE_EXPIRY_MS
        }
        localStorage.setItem(cacheKey, JSON.stringify(cachedMedia))
      } catch (retryError) {
        console.error("Failed to cache after cleanup:", retryError)
      }
    }
  }
}

function clearExpiredCache(): void {
  const now = Date.now()
  const keysToRemove: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('s3-preview-cache:')) {
      try {
        const cached = localStorage.getItem(key)
        if (cached) {
          const cachedMedia: CachedMedia = JSON.parse(cached)
          if (now > cachedMedia.expiry) {
            keysToRemove.push(key)
          }
        }
      } catch (error) {
        // If we can't parse it, remove it
        keysToRemove.push(key)
      }
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key))
}

function isVideoFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() || ""
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']
  return videoExts.includes(ext)
}

function getMediaType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || ""
  const extMap: { [key: string]: string } = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogg': 'video/ogg',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska'
  }
  return extMap[ext] || 'application/octet-stream'
}

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
  const isVideo = isVideoFile(props.object.name)

  useEffect(() => {
    (async () => {
      if (props.bucket && props.object.path) {
        // Try to get from cache first
        const cachedData = getFromCache(props.bucket, props.object.path)
        if (cachedData) {
          if (data !== cachedData) {
            setData(cachedData)
          }
          return
        }

        // If not in cache, fetch from S3
        const currentData = await getObjectContent(props.s3Client, props.bucket, props.object.path)
        if (currentData) {
          const mediaType = getMediaType(props.object.name)
          const mediaSrc = `data:${mediaType};base64,` + Buffer.from(currentData).toString("base64")
          if (data !== mediaSrc) {
            setData(mediaSrc)
            // Save to cache
            saveToCache(props.bucket, props.object.path, mediaSrc)
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
            a.download = props.object.name
            a.click();
            document.body.removeChild(a)
          }}/>
          <img className="" src={person} onClick={(e) => setShowShareModal(true)}/>
        </div>
      </div>
      <div className="preview-content" onClick={(e) => e.stopPropagation()}>
        {isVideo ? (
          <video src={data} controls style={{maxWidth: '90vw', maxHeight: '80vh'}} />
        ) : (
          <img src={data} style={{maxWidth: '90vw', maxHeight: '80vh'}} />
        )}
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