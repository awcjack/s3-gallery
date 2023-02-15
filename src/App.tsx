import { useEffect, useState } from 'react'
import { S3Client } from "@aws-sdk/client-s3";

import LoginModal from "./components/loginModal"
import Header from "./components/header"
import MainContainer from "./components/main/container"
import { listBucket, S3Item } from './components/s3API';
import './App.css'
import { deepEquals } from './utils';

function App() {
  const [showLoginForm, setShowLoginForm] = useState(true)
  const s3AccessKey = localStorage.getItem("s3-access-key") ?? ""
  const s3SecretKey = localStorage.getItem("s3-secret-key") ?? ""
  const [s3Token, setS3Token] = useState({
    accessKey: s3AccessKey,
    secretKey: s3SecretKey
  })
  const [s3Client, setS3Client] = useState(new S3Client({
    region: "US1",
    endpoint: "https://gateway.storjshare.io",
    credentials: {
      accessKeyId: s3Token.accessKey,
      secretAccessKey: s3Token.secretKey,
    },
  }))
  const [bucketList, setBucketList] = useState<S3Item[]>([])
  const [errors, setErrors] = useState<Error[]>([])

  function submitLoginForm(event: React.FormEvent) {
    event.preventDefault()
    localStorage.setItem("s3-access-key", s3Token.accessKey)
    localStorage.setItem("s3-secret-key", s3Token.secretKey)
    setS3Client(new S3Client({
      region: "US1",
      endpoint: "https://gateway.storjshare.io",
      credentials: {
        accessKeyId: s3Token.accessKey,
        secretAccessKey: s3Token.secretKey,
      },
    }))
  }

  useEffect(() => {
    (async () => {
      const s3Cred = await s3Client.config.credentials()
      if (s3Cred.accessKeyId && s3Cred.secretAccessKey) {
        try {
          const newBucketlist = await listBucket(s3Client)
          if (!deepEquals(bucketList, newBucketlist)) {
            setBucketList(newBucketlist)
          }
        } catch (e) {
          if (e instanceof Error) {
            setErrors([...errors, e])
          }
        }
      }
    })()
  })

  return (
    <div className="App">
      <Header logined={true} openLoginForm={() => setShowLoginForm(true)}/>
      {showLoginForm ? <LoginModal closeLoginForm={()=>setShowLoginForm(false)} submitForm={submitLoginForm} setS3Token={setS3Token} s3Token={s3Token}/> : null}
      <MainContainer s3Client={s3Client} bucketList={bucketList}/>
    </div>
  )
}

export default App
