import { S3Item, getObjectContent, getPresignedDownloadUrl } from "../s3API"
import { S3Client } from "@aws-sdk/client-s3"
import "./main.css"
import { useState, useEffect } from "react"
import { Buffer } from "buffer"

function normaliseSize(size: number): string {
  const unit = ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB", "RB", "QB"]
  let time = 0

  while (size > 1000) {
    size /= 1000
    time++
  }
  return (Math.round(size * 100) / 100) + unit[time]
}

function isMediaFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() || ""
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']
  return imageExts.includes(ext) || videoExts.includes(ext)
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

function MediaThumbnail(props: {
  s3Client: S3Client,
  bucket: string,
  item: S3Item
}) {
  const [thumbnail, setThumbnail] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const isVideo = isVideoFile(props.item.name)

  useEffect(() => {
    let isMounted = true
    const loadThumbnail = async () => {
      if (props.item.path && props.bucket) {
        try {
          setLoading(true)
          const data = await getObjectContent(props.s3Client, props.bucket, props.item.path)
          if (data && isMounted) {
            const mediaType = getMediaType(props.item.name)
            const mediaSrc = `data:${mediaType};base64,` + Buffer.from(data).toString("base64")
            setThumbnail(mediaSrc)
          }
        } catch (error) {
          console.error("Error loading thumbnail:", error)
        } finally {
          if (isMounted) {
            setLoading(false)
          }
        }
      }
    }
    loadThumbnail()
    return () => {
      isMounted = false
    }
  }, [props.s3Client, props.bucket, props.item.path])

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '150px',
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px'
      }}>
        <span>Loading...</span>
      </div>
    )
  }

  if (!thumbnail) {
    return (
      <div style={{
        width: '100%',
        height: '150px',
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        fontSize: '3em'
      }}>
        {isVideo ? "🎬" : "🖼️"}
      </div>
    )
  }

  return (
    <div style={{
      width: '100%',
      height: '150px',
      overflow: 'hidden',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000'
    }}>
      {isVideo ? (
        <video
          src={thumbnail}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <img
          src={thumbnail}
          alt={props.item.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      )}
    </div>
  )
}

export default function itemList(props: {
  itemList: S3Item[],
  setBucket: React.Dispatch<React.SetStateAction<string>>,
  setPath: React.Dispatch<React.SetStateAction<string>>,
  setCurrentFile: React.Dispatch<React.SetStateAction<S3Item>>,
  s3Client: S3Client,
  bucket: string,
  onDownloadAll: () => void
}) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')

  const handleItemClick = (item: S3Item) => {
    if (item.isBucket) {
      if (item.path !== null && item.path !== undefined) {
        props.setBucket(item.path)
      } else {
        props.setBucket(item.name)
      }
    } else if (item.isDirectory) {
      if (item.path) {
        props.setPath(item.path)
      } else {
        props.setPath(item.name)
      }
    } else {
      if (item.path) {
        props.setCurrentFile(item)
      } else {
        props.setCurrentFile(item)
      }
    }
  }

  const handleDownload = async (e: React.MouseEvent, item: S3Item) => {
    e.stopPropagation()
    if (item.path && !item.isBucket && !item.isDirectory) {
      const presignedUrl = await getPresignedDownloadUrl(props.s3Client, props.bucket, item.path, 300)
      const a = document.createElement("a")
      document.body.appendChild(a)
      a.setAttribute("style", "display: none")
      a.href = presignedUrl
      a.download = item.name
      a.click()
      document.body.removeChild(a)
    }
  }

  const mediaItems = props.itemList.filter(item => !item.isBucket && !item.isDirectory && isMediaFile(item.name))

  return (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <div style={{padding: '10px', borderBottom: '2px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '8px 16px',
              marginRight: '8px',
              backgroundColor: viewMode === 'grid' ? '#1a73e8' : '#f1f3f4',
              color: viewMode === 'grid' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '8px 16px',
              backgroundColor: viewMode === 'list' ? '#1a73e8' : '#f1f3f4',
              color: viewMode === 'list' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            List View
          </button>
        </div>
        {mediaItems.length > 0 && (
          <button
            onClick={props.onDownloadAll}
            style={{
              padding: '8px 16px',
              backgroundColor: '#34a853',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Download All Media ({mediaItems.length})
          </button>
        )}
      </div>
      {viewMode === 'grid' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px',
          padding: '16px',
          overflowY: 'auto',
          flex: 1
        }}>
          {props.itemList.map((item, index) => (
            <div
              key={index}
              onClick={() => handleItemClick(item)}
              style={{
                border: '1px solid #dadce0',
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                backgroundColor: 'white',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '120px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
                e.currentTarget.style.borderColor = '#1a73e8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = '#dadce0'
              }}
            >
              <div>
                {!item.isBucket && !item.isDirectory && isMediaFile(item.name) ? (
                  <MediaThumbnail s3Client={props.s3Client} bucket={props.bucket} item={item} />
                ) : (
                  <div style={{fontSize: '2.5em', textAlign: 'center', marginBottom: '8px'}}>
                    {item.isBucket ? "🪣" : item.isDirectory ? "🗂️" : "📄"}
                  </div>
                )}
                <div style={{
                  fontWeight: '500',
                  fontSize: '0.9em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: '4px',
                  marginTop: '8px'
                }} title={item.name}>
                  {item.name}
                </div>
              </div>
              <div>
                <div style={{fontSize: '0.75em', color: '#5f6368', marginBottom: '8px'}}>
                  {item.isBucket || item.isDirectory ? "-" : item.size ? normaliseSize(item.size) : "0"}
                </div>
                {!item.isBucket && !item.isDirectory && (
                  <button
                    onClick={(e) => handleDownload(e, item)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      backgroundColor: '#1a73e8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85em'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1557b0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a73e8'}
                  >
                    Download
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="list">
          <div className="header">
            <div>Name</div>
            <div>Last modified date</div>
            <div>Size</div>
            <div>Actions</div>
          </div>
          {props.itemList.map((item, index) => (
            <div key={index} onDoubleClick={() => handleItemClick(item)}>
              <div>{item.isBucket ? "🪣" + item.name : item.isDirectory ? "🗂️" + item.name : item.name}</div>
              <div>{item.lastModified ? new Intl.DateTimeFormat("en-GB").format(item.lastModified) : "-"}</div>
              <div>{item.isBucket || item.isDirectory ? "-" : item.size ? normaliseSize(item.size) : "0"}</div>
              <div>
                {!item.isBucket && !item.isDirectory && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(e, item)
                    }}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#1a73e8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85em'
                    }}
                  >
                    Download
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}