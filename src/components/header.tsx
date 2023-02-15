import "./header.css"

export default function header(props: {
  logined: boolean,
  openLoginForm: React.EventHandler<React.MouseEvent<HTMLElement>>,
}) {

  return (
    <div className="top-nav-bar">
      <div className="icon">
        <img src="/undraw_posting_photo_re_plk8.svg" />
        <a href="/">S3 Gallery</a>
      </div>
      <div className="login">
        {props.logined ? <div onClick={props.openLoginForm}>Logined, Switch User</div> : <button onClick={props.openLoginForm}>Login</button>}
      </div>
    </div>
  )
}