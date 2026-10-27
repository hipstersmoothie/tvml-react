// swift-tools-version:5.9
import PackageDescription

let package = Package(
  name: "TVMLReactExtras",
  platforms: [.tvOS(.v15)],
  products: [
    .library(name: "TVMLReactExtras", targets: ["TVMLReactExtras"])
  ],
  targets: [
    .target(name: "TVMLReactExtras", path: "native/Sources/TVMLReactExtras")
  ]
)
