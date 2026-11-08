#if !SWIFT_PACKAGE
import Foundation
import XCTest
import SceneKit
import UIKit

/// Apple-only checks at the converted-source/SceneKit boundary. These load the
/// real bundled cottage rather than a hand-written mirror of its geometry.
final class NativeRenderingTests: XCTestCase {
    private func load() throws -> (SceneDocument, NativeScene) {
        let resources = try XCTUnwrap(Bundle.main.resourceURL).appendingPathComponent("NativeContent")
        let scene = try SceneDocument.load(data: Data(contentsOf: resources.appendingPathComponent("scene.json")))
        return (scene, try NativeScene(document: scene, resourceURL: resources))
    }

    func testConvertedFurnitureHasNativeTrianglesAndSourceTextures() throws {
        let (document, rendered) = try load()
        let furniture = try XCTUnwrap(document.objects.first { $0.assetID == "painted_wooden_table" })
        let table = try XCTUnwrap(rendered.scene.rootNode.childNode(withName: furniture.id, recursively: true))
        var triangleCount = 0
        var texturedParts = 0
        table.enumerateChildNodes { child, _ in
            guard let geometry = child.geometry else { return }
            triangleCount += geometry.elements.filter { $0.primitiveType == .triangles }.reduce(0) { $0 + $1.primitiveCount }
            if geometry.firstMaterial?.diffuse.contents is UIImage {
                texturedParts += 1
                XCTAssertFalse(geometry.sources(for: .texcoord).isEmpty, "A source texture needs source UV coordinates.")
            }
        }
        XCTAssertGreaterThan(triangleCount, 12, "The licensed table must use its converted mesh, not a box replacement.")
        XCTAssertGreaterThan(texturedParts, 0, "The actual table texture must load from the exported resource bundle.")
    }

    func testDoorUsesSourceClosedPoseAndNativeHinge() throws {
        let (document, rendered) = try load()
        let door = try XCTUnwrap(document.objects.first { $0.kind == "door" })
        let doorID = try XCTUnwrap(door.doorID)
        let leaf = try XCTUnwrap(rendered.scene.rootNode.childNode(withName: door.id, recursively: true))
        // SceneKit's pivot places the geometry centre above the source's bottom
        // anchor. Check the rendered box surfaces, not that centre's world pose.
        let bottom = leaf.convertPosition(SCNVector3(0, -Float(door.size.y / 2), 0), to: nil)
        let top = leaf.convertPosition(SCNVector3(0, Float(door.size.y / 2), 0), to: nil)
        let leftBottom = leaf.convertPosition(SCNVector3(-Float(door.size.x / 2), -Float(door.size.y / 2), 0), to: nil)
        XCTAssertEqual(Double(bottom.x), door.position.x, accuracy: 0.0001)
        XCTAssertEqual(Double(bottom.y), door.position.y, accuracy: 0.0001)
        XCTAssertEqual(Double(bottom.z), door.position.z, accuracy: 0.0001)
        XCTAssertEqual(Double(top.y), door.position.y + door.size.y, accuracy: 0.0001)
        XCTAssertEqual(Double(leftBottom.x), door.position.x - cos(door.yaw) * door.size.x / 2, accuracy: 0.0001)
        XCTAssertEqual(Double(leftBottom.z), door.position.z + sin(door.yaw) * door.size.x / 2, accuracy: 0.0001)
        let hinge = try XCTUnwrap(leaf.parent)
        XCTAssertEqual(Double(hinge.worldPosition.x), door.position.x - cos(door.yaw) * door.size.x / 2, accuracy: 0.0001)
        SCNTransaction.begin()
        SCNTransaction.disableActions = true
        rendered.update(position: document.spawn, yaw: 0, pitch: 0, torchOn: true,
            doorsOpen: [doorID], collected: [])
        SCNTransaction.commit()
        XCTAssertEqual(Double(hinge.eulerAngles.y), door.yaw + .pi / 2, accuracy: 0.0001)
    }

    func testCollectionHidesWireAndPreservesItsFurnitureSurface() throws {
        let (document, rendered) = try load()
        let loose = try XCTUnwrap(document.interactions.first { $0.kind == "loose" })
        let table = try XCTUnwrap(rendered.scene.rootNode.childNode(withName: loose.objectID, recursively: true))
        let wire = try XCTUnwrap(rendered.scene.rootNode.childNode(withName: "native-loot-" + loose.id, recursively: true))
        rendered.update(position: document.spawn, yaw: 0.5, pitch: 0.2, torchOn: false,
            doorsOpen: [], collected: [loose.id])
        XCTAssertTrue(wire.isHidden)
        XCTAssertFalse(table.isHidden, "Collecting an item must retain the authored table and its collider.")
        XCTAssertEqual(Double(rendered.camera.position.x), document.spawn.x, accuracy: 0.0001)
        XCTAssertEqual(Double(rendered.camera.eulerAngles.y), 0.5, accuracy: 0.0001)
        let torch = try XCTUnwrap(rendered.camera.childNodes.first { $0.light?.type == .spot })
        XCTAssertTrue(torch.isHidden)
    }
    func testForestInstancesShareGeometryAndTerrainIsNativeMesh() throws {
        let (document, rendered) = try load()
        let trees = document.objects.filter { $0.id.hasPrefix("native-forest-") }
        XCTAssertGreaterThan(trees.count,30)
        let a = try XCTUnwrap(rendered.scene.rootNode.childNode(withName: trees[0].id, recursively:true)?.childNodes.first?.childNodes.first?.geometry)
        let b = try XCTUnwrap(rendered.scene.rootNode.childNode(withName: trees[1].id, recursively:true)?.childNodes.first?.childNodes.first?.geometry)
        XCTAssertTrue(a === b, "Repeated source assets must share native GPU geometry buffers")
        let terrain = try XCTUnwrap(rendered.scene.rootNode.childNode(withName:"runtime-terrain",recursively:true)?.geometry)
        XCTAssertEqual(terrain.elements[0].primitiveCount,70*70*2)
        XCTAssertNotNil(terrain.firstMaterial?.diffuse.contents)
    }

}
#endif
