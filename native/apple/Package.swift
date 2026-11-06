// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "FieldSignalNative",
    products: [.library(name: "FieldSignalCore", targets: ["FieldSignalCore"])],
    targets: [
        .target(name: "FieldSignalCore", path: "Sources/Core"),
        .testTarget(name: "FieldSignalCoreTests", dependencies: ["FieldSignalCore"], path: "Tests")
    ]
)
