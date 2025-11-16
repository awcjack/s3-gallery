import { useEffect, useState } from 'react'
import { S3Client } from "@aws-sdk/client-s3"
import { listPath, S3Item, getPresignedDownloadUrl } from '../s3API'

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
      <List
        itemList={currentDir}
        setBucket={setBucket}
        setPath={setPath}
        setCurrentFile={setCurrentFile}
        s3Client={props.s3Client}
        bucket={bucket}
        onDownloadAll={handleDownloadAll}
        onUploadClick={() => setShowUploadModal(true)}
      />
      <PathBar bucket={bucket} path={path} setBucket={setBucket} setPath={setPath}/>
    </div>

  )
}