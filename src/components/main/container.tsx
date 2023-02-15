import { useEffect, useState } from 'react'
import { S3Client } from "@aws-sdk/client-s3"
import { listPath, S3Item } from '../s3API'

import LeftSidebar from './leftSidebar'
import PathBar from './pathBar'
import List from "./list"
import Preview from "./preview"

import "./main.css"
import { deepEquals } from '../../utils'

export default function mainContainer(props: {
  s3Client: S3Client,
  bucketList: S3Item[]
}) {
  const [bucket, setBucket] = useState("")
  const [path, setPath] = useState("")
  const [currentFile, setCurrentFile] = useState<S3Item|null>(null)
  const [currentDir, setCurrentDir] = useState<S3Item[]>([])

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
    })()
  })

  return (
    <div className="container">
      <LeftSidebar bucketList={props.bucketList} goRoot={() => setBucket("")}/>
      {bucket && currentFile ? <Preview s3Client={props.s3Client} bucket={bucket} object={currentFile} closePreview={() => setCurrentFile(null)}/> : null}
      <List itemList={currentDir} setBucket={setBucket} setPath={setPath} setCurrentFile={setCurrentFile}/>
      <PathBar bucket={bucket} path={path} setBucket={setBucket} setPath={setPath}/>
    </div>
    
  )
}