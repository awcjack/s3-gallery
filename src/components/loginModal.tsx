function updateAccessKey(event: React.FormEvent<HTMLInputElement>, setS3Token: React.Dispatch<React.SetStateAction<{
  accessKey: string;
  secretKey: string;
  endpoint: string;
  region: string;
  bucket: string;
}>>) {
  event.persist()
  setS3Token((values) => ({
    ...values,
    accessKey: (event.target as HTMLInputElement).value
  }))
}

function updateSecretKey(event: React.FormEvent<HTMLInputElement>, setS3Token: React.Dispatch<React.SetStateAction<{
  accessKey: string;
  secretKey: string;
  endpoint: string;
  region: string;
  bucket: string;
}>>) {
  event.persist()
  setS3Token((values) => ({
    ...values,
    secretKey: (event.target as HTMLInputElement).value
  }))
}

function updateEndpoint(event: React.FormEvent<HTMLInputElement>, setS3Token: React.Dispatch<React.SetStateAction<{
  accessKey: string;
  secretKey: string;
  endpoint: string;
  region: string;
  bucket: string;
}>>) {
  event.persist()
  setS3Token((values) => ({
    ...values,
    endpoint: (event.target as HTMLInputElement).value
  }))
}

function updateRegion(event: React.FormEvent<HTMLInputElement>, setS3Token: React.Dispatch<React.SetStateAction<{
  accessKey: string;
  secretKey: string;
  endpoint: string;
  region: string;
  bucket: string;
}>>) {
  event.persist()
  setS3Token((values) => ({
    ...values,
    region: (event.target as HTMLInputElement).value
  }))
}

function updateBucket(event: React.FormEvent<HTMLInputElement>, setS3Token: React.Dispatch<React.SetStateAction<{
  accessKey: string;
  secretKey: string;
  endpoint: string;
  region: string;
  bucket: string;
}>>) {
  event.persist()
  setS3Token((values) => ({
    ...values,
    bucket: (event.target as HTMLInputElement).value
  }))
}

export default function loginForm(props: {
  closeLoginForm: () => void,
  submitForm: React.FormEventHandler<HTMLFormElement>,
  setS3Token: React.Dispatch<React.SetStateAction<{
    accessKey: string;
    secretKey: string;
    endpoint: string;
    region: string;
    bucket: string;
  }>>, s3Token: {
    accessKey: string;
    secretKey: string;
    endpoint: string;
    region: string;
    bucket: string;
  },
  showPreview: boolean,
  setShowPreview: React.Dispatch<React.SetStateAction<boolean>>
}) {
  return (
    <div className="modal-bg" onClick={(e) => props.closeLoginForm()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={(e) => {
          props.submitForm(e)
          props.closeLoginForm()
        }}>
          <div style={{fontSize: "1.5em", marginBottom: "10px"}}>S3 Configuration</div>
          <input
            id="access-key"
            className="login-modal-input"
            type="text"
            placeholder="S3 Access Key"
            name="s3AccessKey"
            value={props.s3Token.accessKey}
            onInput={(event) => updateAccessKey(event, props.setS3Token)}
          /><br />
          <input
            id="secret-key"
            className="login-modal-input"
            type="text"
            placeholder="S3 Secret Key"
            name="s3SecretKey"
            value={props.s3Token.secretKey}
            onInput={(event) => updateSecretKey(event, props.setS3Token)}
          /><br />
          <input
            id="endpoint"
            className="login-modal-input"
            type="text"
            placeholder="S3 Endpoint URL (e.g., https://s3.amazonaws.com)"
            name="s3Endpoint"
            value={props.s3Token.endpoint}
            onInput={(event) => updateEndpoint(event, props.setS3Token)}
          /><br />
          <input
            id="region"
            className="login-modal-input"
            type="text"
            placeholder="Region (e.g., us-east-1)"
            name="s3Region"
            value={props.s3Token.region}
            onInput={(event) => updateRegion(event, props.setS3Token)}
          /><br />
          <input
            id="bucket"
            className="login-modal-input"
            type="text"
            placeholder="Bucket (optional)"
            name="s3Bucket"
            value={props.s3Token.bucket}
            onInput={(event) => updateBucket(event, props.setS3Token)}
          /><br />
          <div style={{marginTop: "15px", marginBottom: "15px"}}>
            <label style={{display: "flex", alignItems: "center", cursor: "pointer"}}>
              <input
                id="show-preview"
                type="checkbox"
                checked={props.showPreview}
                onChange={(e) => props.setShowPreview(e.target.checked)}
                style={{marginRight: "8px", cursor: "pointer"}}
              />
              <span>Enable media preview</span>
            </label>
          </div>
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  )
}