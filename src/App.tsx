import { useEffect, useState } from 'react'
import { S3Client } from "@aws-sdk/client-s3";

import LoginModal from "./components/loginModal"
import Header from "./components/header"
import MainContainer from "./components/main/container"
import { listBucket, S3Item } from './components/s3API';
import './App.css'
import { deepEquals } from './utils';

function App() {
  // Parse URL parameters for credentials and endpoint
  const urlParams = new URLSearchParams(window.location.search)
  const urlAccessKey = urlParams.get('accessKey') || ""
  const urlSecretKey = urlParams.get('secretKey') || ""
  const urlEndpoint = urlParams.get('endpoint') || ""
  const urlRegion = urlParams.get('region') || ""

  const s3AccessKey = urlAccessKey || localStorage.getItem("s3-access-key") || ""
  const s3SecretKey = urlSecretKey || localStorage.getItem("s3-secret-key") || ""
  const s3Endpoint = urlEndpoint || localStorage.getItem("s3-endpoint") || "https://gateway.storjshare.io"
  const s3Region = urlRegion || localStorage.getItem("s3-region") || "US1"

  const [showLoginForm, setShowLoginForm] = useState(!s3AccessKey || !s3SecretKey)
  const [s3Token, setS3Token] = useState({
    accessKey: s3AccessKey,
    secretKey: s3SecretKey,
    endpoint: s3Endpoint,
    region: s3Region
  })
  const [s3Client, setS3Client] = useState(new S3Client({
    region: s3Token.region,
    endpoint: s3Token.endpoint,
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
    localStorage.setItem("s3-endpoint", s3Token.endpoint)
    localStorage.setItem("s3-region", s3Token.region)
    setS3Client(new S3Client({
      region: s3Token.region,
      endpoint: s3Token.endpoint,
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
