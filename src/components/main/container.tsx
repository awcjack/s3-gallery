import { useEffect, useState } from 'react'
import { S3Client } from "@aws-sdk/client-s3"
import { listPath, S3Item, getPresignedDownloadUrl, uploadObjects, UploadProgress } from '../s3API'

import PathBar from './pathBar'
import List from "./list"
import Preview from "./preview"
import UploadModal from "../uploadModal"

import "./main.css"
import { deepEquals } from '../../utils'

function isMediaFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() || ""
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma']
  return imageExts.includes(ext) || videoExts.includes(ext) || audioExts.includes(ext)
}

export default function mainContainer(props: {
  s3Client: S3Client,
  bucketList: S3Item[],
  initialBucket?: string,
  initialPath?: string,
  onPathChange?: (bucket: string, path: string) => void
}) {
  const [bucket, setBucket] = useState(props.initialBucket || "")
  const [path, setPath] = useState(props.initialPath || "")
  const [currentFile, setCurrentFile] = useState<S3Item|null>(null)
  const [currentDir, setCurrentDir] = useState<S3Item[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[] | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    (async () => {
      if (bucket) {
        let pathContent: S3Item[]
        if (path.length) {
          pathContent = await listPath(props.s3Client, bucket, "/", path)
        } else {
          pathContent = await listPath(props.s3Client, bucket, "/", "")
        }
        if (!deepEquals(currentDir, pathContent)) {
          setCurrentDir(pathContent)
        }
      } else if (!deepEquals(props.bucketList, currentDir)) {
        setCurrentDir(props.bucketList)
        setPath("")
      }
      // Notify parent of path changes
      if (props.onPathChange) {
        props.onPathChange(bucket, path)
      }
    })()
  })

  const handleDownloadAll = async () => {
    const mediaItems = currentDir.filter(item =>
      !item.isBucket && !item.isDirectory && isMediaFile(item.name)
    )

    for (const item of mediaItems) {
      if (item.path) {
        const presignedUrl = await getPresignedDownloadUrl(props.s3Client, bucket, item.path, 300)
        const a = document.createElement("a")
        document.body.appendChild(a)
        a.setAttribute("style", "display: none")
        a.href = presignedUrl
        a.download = item.name
        a.click()
        document.body.removeChild(a)
        // Add a small delay between downloads to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }

  const handleUploadComplete = () => {
    // Refresh the current directory listing
    const refreshDir = async () => {
      if (bucket) {
        let pathContent: S3Item[]
        if (path.length) {
          pathContent = await listPath(props.s3Client, bucket, "/", path)
        } else {
          pathContent = await listPath(props.s3Client, bucket, "/", "")
        }
        setCurrentDir(pathContent)
      }
    }
    refreshDir()
  }

  const handleFilesDropped = async (files: File[]) => {
    if (files.length === 0 || isUploading || !bucket) return

    setIsUploading(true)

    try {
      // Convert files to the format expected by uploadObjects
      const filesToUpload = await Promise.all(
        files.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer()
          const uint8Array = new Uint8Array(arrayBuffer)

          // Preserve folder structure from webkitRelativePath if available
          const fileName = (file as any).webkitRelativePath || file.name

          return {
            name: fileName,
            data: uint8Array,
            type: file.type || undefined
          }
        })
      )

      await uploadObjects(
        props.s3Client,
        bucket,
        path,
        filesToUpload,
        setUploadProgress
      )

      // Wait a moment to show completion
      setTimeout(() => {
        handleUploadComplete()
        setUploadProgress(null)
        setIsUploading(false)
      }, 1500)
    } catch (error) {
      console.error("Upload error:", error)
      alert("Upload failed: " + (error instanceof Error ? error.message : "Unknown error"))
      setUploadProgress(null)
      setIsUploading(false)
    }
  }

  const uploadedCount = uploadProgress?.filter(p => p.status === 'completed').length || 0
  const totalCount = uploadProgress?.length || 0

  return (
    <div className="container">
      {bucket && currentFile ? <Preview s3Client={props.s3Client} bucket={bucket} object={currentFile} closePreview={() => setCurrentFile(null)}/> : null}
      {showUploadModal && bucket ? (
        <UploadModal
          s3Client={props.s3Client}
          bucket={bucket}
          path={path}
          closeModal={() => setShowUploadModal(false)}
          onUploadComplete={handleUploadComplete}
        />
      ) : null}
      {uploadProgress && isUploading && (
        <div className="upload-toast">
          <div className="upload-toast-header">
            <span>Uploading Files... {uploadedCount}/{totalCount}</span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{
                width: `${totalCount > 0 ? (uploadedCount / totalCount) * 100 : 0}%`
              }}
            />
          </div>
          <div className="upload-toast-files">
            {uploadProgress.slice(-3).map((progress, index) => (
              <div key={index} className="upload-toast-file">
                <span className="upload-toast-icon">
                  {progress.status === 'pending' ? '⏳' :
                   progress.status === 'uploading' ? '⬆️' :
                   progress.status === 'completed' ? '✅' : '❌'}
                </span>
                <span className="upload-toast-filename">{progress.fileName}</span>
              </div>
            ))}
            {uploadProgress.length > 3 && (
              <div className="upload-toast-more">
                +{uploadProgress.length - 3} more files
              </div>
            )}
          </div>
        </div>
      )}
      <List
        itemList={currentDir}
        setBucket={setBucket}
        setPath={setPath}
        setCurrentFile={setCurrentFile}
        s3Client={props.s3Client}
        bucket={bucket}
        onDownloadAll={handleDownloadAll}
        onUploadClick={() => setShowUploadModal(true)}
        onFilesDropped={handleFilesDropped}
      />
      <PathBar bucket={bucket} path={path} setBucket={setBucket} setPath={setPath}/>
    </div>

  )
}