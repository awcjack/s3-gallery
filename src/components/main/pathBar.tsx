import "./main.css"

export default function pathBar(props: {
  bucket: string,
  path: string,
  setBucket: React.Dispatch<React.SetStateAction<string>>,
  setPath: React.Dispatch<React.SetStateAction<string>>
}) {
  const pathSpans = [<span onClick={(e) => props.setPath("")}>{props.bucket + "/"}</span>]
  if (props.path !== "/") {
    const pathArray = props.path.split("/")
    for (let i = 0; i < pathArray.length - 1; i++) {
      pathSpans.push(<span onClick={(e) => props.setPath(pathArray.slice(0, i + 1).join("/") + "/")}>{pathArray[i] + "/"}</span>)
    }
  }
  return (
    <div className="pathBar">
      {
        props.bucket ?
        pathSpans :
        <span></span>
      }
    </div>
  )
}