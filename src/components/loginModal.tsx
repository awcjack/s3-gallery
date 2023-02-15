function updateAccessKey(event: React.FormEvent<HTMLInputElement>, setS3Token: React.Dispatch<React.SetStateAction<{
  accessKey: string;
  secretKey: string;
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
}>>) {
  event.persist()
  setS3Token((values) => ({
    ...values,
    secretKey: (event.target as HTMLInputElement).value
  }))
}

export default function loginForm(props: {
  closeLoginForm: () => void,
  submitForm: React.FormEventHandler<HTMLFormElement>,
  setS3Token: React.Dispatch<React.SetStateAction<{
    accessKey: string;
    secretKey: string;
  }>>, s3Token: {
    accessKey: string;
    secretKey: string;
  }
}) {
  return (
    <div className="modal-bg" onClick={(e) => props.closeLoginForm()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={(e) => {
          props.submitForm(e)
          props.closeLoginForm()
        }}>
          Login<br/>
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
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  )
}