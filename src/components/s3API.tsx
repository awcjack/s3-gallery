import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export interface S3Item {
  name: string
  path?: string
  size?: number
  lastModified?: Date
  isBucket?: boolean
  isDirectory?: boolean
}

export async function listBucket(s3Client: S3Client): Promise<S3Item[]> {
  const data = await s3Client.send(new ListBucketsCommand({}))
  const result = []
  if (data.Buckets) {
    for (const bucket of data.Buckets) {
      if (bucket.Name) {
        result.push({
          name: bucket.Name,
          path: bucket.Name,
          lastModified: bucket.CreationDate,
          isBucket: true
        })
      }
    }
  }
  return result
}

export async function listPath(s3Client: S3Client, bucket: string, delimiter: string = "/", path: string, showHiddenFile: boolean = false): Promise<S3Item[]> {
  const data = await s3Client.send(new ListObjectsV2Command({
    Bucket: bucket,
    Delimiter: delimiter,
    Prefix: path
  }))
  const result = []
  if (bucket && (!path || path == "/")) {
    result.push({
      name: "..",
      path: "",
      isBucket: true
    })
  }
  if (path && path !== "/") {
    const pathArray = path.split("/")
    result.push({
      name: "..",
      path: pathArray.slice(0, pathArray.length - 2).join("/") + "/",
      isDirectory: true
    })
  }
  if (data.CommonPrefixes && data.CommonPrefixes.length) {
    for (const dir of data.CommonPrefixes) {
      if (dir.Prefix) {
        const dirPath = dir.Prefix.split("/")
        if (showHiddenFile || dirPath[dirPath.length - 2][0] != ".") {
          result.push({
            name: dirPath[dirPath.length - 2],
            path: dir.Prefix,
            isDirectory: true
          })
        }
      }
    }
  }
  if (data.Contents && data.Contents.length) {
    for (const file of data.Contents) {
      if (file.Key) {
        const fileName = file.Key.substring(data?.Prefix?.length || 0)
        if (showHiddenFile || fileName[0] != ".") {
          result.push({
            name: fileName,
            path: file.Key,
            size: file.Size,
            lastModified: file.LastModified
          })
        }
      }
    }
  }

  return result;
}

export async function getObjectContent(s3Client: S3Client, bucket: string, path: string): Promise<Uint8Array|null> {
  const data = await s3Client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: path,
    // Range: "bytes=1-1000"
  }))

  if (data.Body) {
    return data.Body?.transformToByteArray()
  }

  return null
}

export async function getPresignedDownloadUrl(s3Client: S3Client, bucket: string, path: string, expireAfter: number): Promise<string> {
  // @ts-ignore
  const url = await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: bucket,
    Key: path,
  }), { expiresIn: expireAfter })

  return url
}

export async function uploadObject(s3Client: S3Client, bucket: string, key: string, body: Uint8Array, contentType?: string): Promise<void> {
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  }))
}

export interface UploadProgress {
  fileName: string
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  error?: string
}

export async function uploadObjects(
  s3Client: S3Client,
  bucket: string,
  path: string,
  files: Array<{name: string, data: Uint8Array, type?: string}>,
  onProgress?: (progress: UploadProgress[]) => void
): Promise<void> {
  const progressArray: UploadProgress[] = files.map(file => ({
    fileName: file.name,
    status: 'pending' as const
  }))

  if (onProgress) {
    onProgress([...progressArray])
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    progressArray[i].status = 'uploading'
    if (onProgress) {
      onProgress([...progressArray])
    }

    try {
      const key = path ? `${path}${file.name}` : file.name
      await uploadObject(s3Client, bucket, key, file.data, file.type)
      progressArray[i].status = 'completed'
    } catch (error) {
      progressArray[i].status = 'failed'
      progressArray[i].error = error instanceof Error ? error.message : 'Unknown error'
    }

    if (onProgress) {
      onProgress([...progressArray])
    }
  }
}