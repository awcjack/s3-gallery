import { S3Item } from "../s3API"
import "./main.css"

function normaliseSize(size: number): string {
  const unit = ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB", "RB", "QB"]
  let time = 0

  while (size > 1000) {
    size /= 1000
    time++
  }
  return (Math.round(size * 100) / 100) + unit[time]
}

export default function itemList(props: {
  itemList: S3Item[],
  setBucket: React.Dispatch<React.SetStateAction<string>>,
  setPath: React.Dispatch<React.SetStateAction<string>>,
  setCurrentFile: React.Dispatch<React.SetStateAction<S3Item>>
}) {
  return (
    <div className="list">
      <div className="header">
        <div>Name</div>
        <div>Last modified date</div>
        <div>Size</div>
      </div>
      {props.itemList.length ? 
        props.itemList.map((item) => <div onDoubleClick={(e) => {
          if (item.isBucket) {
            if (item.path !== null && item.path !== undefined) {
              props.setBucket(item.path)
            } else {
              props.setBucket(item.name)
            }
          } else if (item.isDirectory) {
            if (item.path) {
              props.setPath(item.path)
            } else {
              props.setPath(item.name)
            }
          } else {
            if (item.path) {
              props.setCurrentFile(item)
            } else {
              props.setCurrentFile(item)
            }
          }
        }}>
          <div>{item.isBucket ? "🪣" + item.name : item.isDirectory ? "🗂️" + item.name : item.name}</div>
          <div>{item.lastModified ? new Intl.DateTimeFormat("en-GB").format(item.lastModified) : "-"}</div>
          <div>{item.isBucket || item.isDirectory ? "-" : item.size ? normaliseSize(item.size) : "0"}</div>
        </div>)
      :
      null}
    </div>
  )
}