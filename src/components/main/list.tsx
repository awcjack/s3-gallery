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
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma']
  return imageExts.includes(ext) || videoExts.includes(ext) || audioExts.includes(ext)
}

function isVideoFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() || ""
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']
  return videoExts.includes(ext)
}

function isAudioFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() || ""
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma']
  return audioExts.includes(ext)
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
    'mkv': 'video/x-matroska',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    'm4a': 'audio/mp4',
    'wma': 'audio/x-ms-wma'
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
  const isAudio = isAudioFile(props.item.name)

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
      <div className="media-thumbnail-loading">
        <span>Loading...</span>
      </div>
    )
  }

  if (!thumbnail) {
    return (
      <div className="media-thumbnail-placeholder">
        {isVideo ? "🎬" : isAudio ? "🎵" : "🖼️"}
      </div>
    )
  }

  return (
    <div className="media-thumbnail-container">
      {isVideo ? (
        <video
          src={thumbnail}
          className="media-thumbnail"
        />
      ) : isAudio ? (
        <div className="audio-thumbnail">
          <div className="audio-icon">🎵</div>
          <audio
            src={thumbnail}
            controls
            className="audio-preview"
            style={{ width: '100%', marginTop: '10px' }}
          />
        </div>
      ) : (
        <img
          src={thumbnail}
          alt={props.item.name}
          className="media-thumbnail"
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
  onDownloadAll: () => void,
  onUploadClick?: () => void,
  onFilesDropped?: (files: File[]) => void
}) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [downloadProgress, setDownloadProgress] = useState<{current: number, total: number} | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

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

  const toggleFileSelection = (e: React.ChangeEvent<HTMLInputElement>, item: S3Item) => {
    e.stopPropagation()
    if (item.path && !item.isBucket && !item.isDirectory) {
      const newSelected = new Set(selectedFiles)
      if (newSelected.has(item.path)) {
        newSelected.delete(item.path)
      } else {
        newSelected.add(item.path)
      }
      setSelectedFiles(newSelected)
    }
  }

  const selectAllFiles = () => {
    const allFiles = props.itemList.filter(item => !item.isBucket && !item.isDirectory)
    const newSelected = new Set<string>()
    allFiles.forEach(item => {
      if (item.path) newSelected.add(item.path)
    })
    setSelectedFiles(newSelected)
  }

  const deselectAllFiles = () => {
    setSelectedFiles(new Set())
  }

  const downloadSelectedAsZip = async () => {
    const JSZip = (await import('jszip')).default
    const filesToDownload = selectedFiles.size > 0
      ? props.itemList.filter(item => item.path && selectedFiles.has(item.path))
      : props.itemList.filter(item => !item.isBucket && !item.isDirectory)

    if (filesToDownload.length === 0) {
      alert("No files to download")
      return
    }

    setDownloadProgress({ current: 0, total: filesToDownload.length })
    const zip = new JSZip()

    try {
      for (let i = 0; i < filesToDownload.length; i++) {
        const item = filesToDownload[i]
        if (item.path) {
          const data = await getObjectContent(props.s3Client, props.bucket, item.path)
          if (data) {
            zip.file(item.name, data)
          }
          setDownloadProgress({ current: i + 1, total: filesToDownload.length })
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${props.bucket || 'files'}-${new Date().getTime()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setDownloadProgress(null)
      setSelectedFiles(new Set())
    } catch (error) {
      console.error("Error creating zip:", error)
      alert("Error creating zip file")
      setDownloadProgress(null)
    }
  }

  const mediaItems = props.itemList.filter(item => !item.isBucket && !item.isDirectory && isMediaFile(item.name))

  const fileCount = props.itemList.filter(item => !item.isBucket && !item.isDirectory).length

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (props.bucket && props.onFilesDropped) {
      setIsDraggingOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if we're leaving the list-container itself
    if (e.currentTarget === e.target) {
      setIsDraggingOver(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)

    if (props.bucket && props.onFilesDropped) {
      const droppedFiles = Array.from(e.dataTransfer.files)
      if (droppedFiles.length > 0) {
        props.onFilesDropped(droppedFiles)
      }
    }
  }

  return (
    <div
      className="list-container"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="toolbar">
        <div className="toolbar-left">
          <button
            onClick={() => setViewMode('grid')}
            className={`md-button ${viewMode === 'grid' ? 'md-button-primary' : 'md-button-secondary'}`}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`md-button ${viewMode === 'list' ? 'md-button-primary' : 'md-button-secondary'}`}
          >
            List View
          </button>
          {props.bucket && props.onUploadClick && (
            <button
              onClick={props.onUploadClick}
              className="md-button md-button-success"
            >
              Upload Files
            </button>
          )}
          {fileCount > 0 && (
            <>
              <button
                onClick={selectAllFiles}
                className="md-button md-button-secondary"
              >
                Select All ({fileCount})
              </button>
              {selectedFiles.size > 0 && (
                <button
                  onClick={deselectAllFiles}
                  className="md-button md-button-secondary"
                >
                  Deselect All
                </button>
              )}
            </>
          )}
        </div>
        <div className="toolbar-right">
          {selectedFiles.size > 0 && (
            <span className="selected-count">
              {selectedFiles.size} selected
            </span>
          )}
          {fileCount > 0 && (
            <button
              onClick={downloadSelectedAsZip}
              disabled={downloadProgress !== null}
              className={`md-button ${downloadProgress !== null ? 'md-button-disabled' : 'md-button-success'}`}
            >
              {downloadProgress !== null
                ? `Downloading ${downloadProgress.current}/${downloadProgress.total}...`
                : selectedFiles.size > 0
                  ? `Download Selected (${selectedFiles.size}) as ZIP`
                  : `Download All (${fileCount}) as ZIP`
              }
            </button>
          )}
        </div>
      </div>
      {isDraggingOver && props.bucket && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <div className="drag-overlay-icon">📁</div>
            <div className="drag-overlay-text">Drop files here to upload</div>
          </div>
        </div>
      )}
      {downloadProgress !== null && (
        <div className="progress-container">
          <div className="progress-label">
            Creating ZIP: {downloadProgress.current}/{downloadProgress.total} files
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{
                width: `${(downloadProgress.current / downloadProgress.total) * 100}%`
              }}
            />
          </div>
        </div>
      )}
      {viewMode === 'grid' ? (
        <div className="grid-view">
          {props.itemList.map((item, index) => (
            <div
              key={index}
              onClick={() => handleItemClick(item)}
              className={`grid-item ${item.path && selectedFiles.has(item.path) ? 'grid-item-selected' : ''}`}
            >
              {!item.isBucket && !item.isDirectory && (
                <input
                  type="checkbox"
                  checked={item.path ? selectedFiles.has(item.path) : false}
                  onChange={(e) => toggleFileSelection(e, item)}
                  onClick={(e) => e.stopPropagation()}
                  className="grid-item-checkbox"
                />
              )}
              <div className="grid-item-content">
                {!item.isBucket && !item.isDirectory && isMediaFile(item.name) ? (
                  <MediaThumbnail s3Client={props.s3Client} bucket={props.bucket} item={item} />
                ) : (
                  <div className="grid-item-icon">
                    {item.isBucket ? "🪣" : item.isDirectory ? "🗂️" : "📄"}
                  </div>
                )}
                <div className="grid-item-name" title={item.name}>
                  {item.name}
                </div>
              </div>
              <div className="grid-item-footer">
                <div className="grid-item-size">
                  {item.isBucket || item.isDirectory ? "-" : item.size ? normaliseSize(item.size) : "0"}
                </div>
                {!item.isBucket && !item.isDirectory && (
                  <button
                    onClick={(e) => handleDownload(e, item)}
                    className="md-button md-button-primary grid-item-download"
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
                    className="md-button md-button-primary md-button-small"
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