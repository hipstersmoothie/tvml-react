// Element names for the scrollable list rendered by SimplifiedListView. The JS
// side renders them through the `SimplifiedList` / `SimplifiedListRow`
// components; `TVMLReact.install()` registers them.
//
// Resulting TVML:
//
//     <divTemplate>
//       <segmentBar style="tv-position: header"> … </segmentBar>
//       <simplifiedList summary="Optional header" style="width: 1920; height: 840">
//         <simplifiedListRow title="Song" subtitle="Artist" accessory="now" image="https://…"/>
//       </simplifiedList>
//     </divTemplate>
//
// TVMLKit applies the element's style (width/height) to the view's frame.
enum SimplifiedListElement {
  static let list = "simplifiedList"
  static let row = "simplifiedListRow"
}
