import { S3Item } from "../s3API"
import "./main.css"

export default function leftSidebar(props: {
  bucketList: S3Item[],
  goRoot: () => void,
}) {
  return (
    <div className="leftSidebar">
      <div onClick={props.goRoot}>/</div>
      <div>Setting</div>
    </div>
  )
}