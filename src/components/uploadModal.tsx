import { useState, useRef, useEffect } from 'react'
import { S3Client } from "@aws-sdk/client-s3"
import { uploadObjects, UploadProgress } from './s3API'

interface UploadModalProps {
  s3Client: S3Client
  bucket: string
  path: string
  closeModal: () => void
  onUploadComplete: () => void
}

export default function UploadModal(props: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[] | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      setFiles(prevFiles => [...prevFiles, ...droppedFiles])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles(prevFiles => [...prevFiles, ...selectedFiles])
    }
  }

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles(prevFiles => [...prevFiles, ...selectedFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0 || isUploading) return

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
        props.bucket,
        props.path,
        filesToUpload,
        setUploadProgress
      )

      // Wait a moment to show completion
      setTimeout(() => {
        props.onUploadComplete()
        props.closeModal()
      }, 1000)
    } catch (error) {
      console.error("Upload error:", error)
      alert("Upload failed: " + (error instanceof Error ? error.message : "Unknown error"))
      setIsUploading(false)
    }
  }

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'uploading': return '⬆️'
      case 'completed': return '✅'
      case 'failed': return '❌'
    }
  }

  const uploadedCount = uploadProgress?.filter(p => p.status === 'completed').length || 0
  const totalCount = uploadProgress?.length || 0

  return (
    <div className="modal-bg" onClick={props.closeModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload Files</h2>
          <button onClick={props.closeModal} className="modal-close">×</button>
        </div>

        <div className="modal-content">
          {!isUploading ? (
            <>
              <div
                className={`upload-dropzone ${isDragging ? 'upload-dropzone-active' : ''}`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="upload-dropzone-content">
                  <div className="upload-icon">📁</div>
                  <p className="upload-text-primary">
                    Drag and drop files or folders here
                  </p>
                  <p className="upload-text-secondary">or</p>
                  <div className="upload-buttons">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="md-button md-button-primary"
                    >
                      Select Files
                    </button>
                    <button
                      onClick={() => folderInputRef.current?.click()}
                      className="md-button md-button-secondary"
                    >
                      Select Folder
                    </button>
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <input
                ref={folderInputRef}
                type="file"
                {...({ webkitdirectory: "", directory: "" } as any)}
                multiple
                onChange={handleFolderSelect}
                style={{ display: 'none' }}
              />

              {files.length > 0 && (
                <div className="upload-file-list">
                  <h3>Selected Files ({files.length})</h3>
                  <div className="upload-files-container">
                    {files.map((file, index) => (
                      <div key={index} className="upload-file-item">
                        <span className="upload-file-name" title={(file as any).webkitRelativePath || file.name}>
                          {(file as any).webkitRelativePath || file.name}
                        </span>
                        <span className="upload-file-size">
                          {(file.size / 1024).toFixed(2)} KB
                        </span>
                        <button
                          onClick={() => removeFile(index)}
                          className="upload-file-remove"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="upload-progress-container">
              <h3>Uploading Files... {uploadedCount}/{totalCount}</h3>
              <div className="progress-bar-bg" style={{ marginBottom: '20px' }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${totalCount > 0 ? (uploadedCount / totalCount) * 100 : 0}%`
                  }}
                />
              </div>
              <div className="upload-files-container">
                {uploadProgress?.map((progress, index) => (
                  <div key={index} className="upload-file-item">
                    <span className="upload-status-icon">
                      {getStatusIcon(progress.status)}
                    </span>
                    <span className="upload-file-name" title={progress.fileName}>
                      {progress.fileName}
                    </span>
                    {progress.error && (
                      <span className="upload-file-error" title={progress.error}>
                        {progress.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!isUploading && (
            <>
              <button
                onClick={props.closeModal}
                className="md-button md-button-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={files.length === 0}
                className={`md-button ${files.length === 0 ? 'md-button-disabled' : 'md-button-success'}`}
              >
                Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}