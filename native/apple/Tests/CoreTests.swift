import Foundation
import XCTest
#if SWIFT_PACKAGE
@testable import FieldSignalCore
#endif

final class CoreTests: XCTestCase {
    private func scene(_ changes: (inout [String: Any]) -> Void = { _ in }) throws -> SceneDocument {
        var json: [String: Any] = [
            "format": "field-signal-native-scene", "version": 1,
            "source": ["revision": String(repeating: "a", count: 40), "worldSHA256": String(repeating: "b", count: 64)],
            "buildingID": "fixture", "spawn": [0, 0, 3],
            "objects": [
                ["id": "native-outdoor", "kind": "floor", "position": [0,0,0], "size": [20,0.1,20], "yaw": 0],
                ["id": "entrance", "kind": "door", "position": [0,0,0], "size": [2,2.3,0.1], "yaw": 0, "doorID": "fixture"],
                ["id": "supplies", "kind": "prop", "position": [0,0,-2], "size": [1,1,1], "yaw": 0],
                ["id": "stairs", "kind": "stairs", "position": [4,0,0], "size": [2,3.2,6], "yaw": 0],
                ["id": "upper", "kind": "floor", "position": [4,3.2,-4], "size": [3,0.2,2], "yaw": 0]
            ],
            "colliders": [
                ["id": "entrance", "position": [0,0,0], "size": [2,2.3,0.1], "yaw": 0, "doorID": "fixture"],
                ["id": "leftwall", "position": [-2,0,0], "size": [2,3,0.3], "yaw": 0],
                ["id": "rightwall", "position": [2,0,0], "size": [2,3,0.3], "yaw": 0]
            ],
            "stairs": [["id":"stairs", "position":[4,0,0], "size":[2,3.2,6], "yaw":0]],
            "interactions": [
                ["id": "fixture", "kind": "door", "objectID": "entrance", "name": "entrance", "position": [0,1.3,0]],
                ["id": "supply_1", "kind": "container", "objectID": "supplies", "name": "cupboard", "position": [0,0.8,-2], "itemID": "bandage"]
            ],
            "items": [["id": "bandage", "name": "Bandage"]]
        ]
        changes(&json)
        return try SceneDocument.load(data: JSONSerialization.data(withJSONObject: json))
    }

    private func walk(_ session: GameSession, forward: Double = 0, strafe: Double = 0, ticks: Int) {
        for _ in 0..<ticks { session.move(strafe: strafe, forward: forward, deltaTime: 0.02) }
    }

    func testDoorBlocksMovementAndSearchThenCollectsOnlyOnce() throws {
        let session = try GameSession(scene: scene())
        walk(session, forward: 1, ticks: 80)
        XCTAssertGreaterThan(session.position.z, 0.27)
        XCTAssertEqual(session.nearestInteraction?.id, "fixture")
        session.interact()
        XCTAssertTrue(session.doorsOpen.contains("fixture"))
        walk(session, forward: 1, ticks: 4)
        session.interact()
        XCTAssertTrue(session.doorsOpen.contains("fixture"), "Closing must not trap a player in the leaf")
        XCTAssertTrue(session.status.contains("Step clear"))
        walk(session, forward: 1, ticks: 21)
        XCTAssertLessThan(session.position.z, -0.8)
        XCTAssertEqual(session.nearestInteraction?.id, "supply_1")
        session.interact()
        XCTAssertTrue(session.searched.contains("supply_1"))
        XCTAssertTrue(session.inventory.isEmpty)
        session.interact()
        XCTAssertEqual(session.inventory["bandage"], 1)
        for _ in 0..<5 { session.interact() }
        XCTAssertEqual(session.inventory["bandage"], 1)
    }

    func testStairsUseContinuousHeightAndUpperLanding() throws {
        let session = try GameSession(scene: scene { $0["spawn"] = [4,0,3.2] })
        var previous = session.position.y
        for _ in 0..<146 {
            session.move(strafe: 0, forward: 1, deltaTime: 0.02)
            XCTAssertGreaterThanOrEqual(session.position.y + 0.001, previous)
            XCTAssertLessThanOrEqual(session.position.y - previous, 0.08)
            previous = session.position.y
        }
        XCTAssertEqual(session.position.y, 3.2, accuracy: 0.01)
        XCTAssertLessThan(session.position.z, -3.5)
        walk(session, forward: -1, ticks: 146)
        XCTAssertEqual(session.position.y, 0, accuracy: 0.01)
    }

    func testCannotWalkThroughSolidHighStairSideAtGroundLevel() throws {
        let session = try GameSession(scene: scene { $0["spawn"] = [6,0,-2] })
        walk(session, strafe: -1, ticks: 50)
        XCTAssertGreaterThan(session.position.x, 5.1)
        XCTAssertEqual(session.position.y, 0)
    }

    func testPauseInventoryAndInvalidInputDoNotMovePlayer() throws {
        let session = try GameSession(scene: scene())
        let start = session.position
        session.setPaused(true)
        walk(session, forward: 1, ticks: 20)
        session.toggleTorch()
        XCTAssertTrue(session.torchOn)
        XCTAssertEqual(session.position, start)
        session.setPaused(false)
        session.toggleInventory()
        walk(session, forward: 1, ticks: 20)
        XCTAssertEqual(session.position, start)
        session.toggleInventory()
        session.move(strafe: .nan, forward: 1, deltaTime: 1)
        XCTAssertEqual(session.position, start)
        session.move(strafe: 0, forward: 0, lookPitch: 10, deltaTime: 0)
        XCTAssertEqual(session.pitch, 1.2)
    }

    func testSaveRoundTripAndCorruptSourceRejectedWithoutMutation() throws {
        let document = try scene()
        let session = try GameSession(scene: document)
        walk(session, forward: 1, ticks: 35)
        session.interact()
        session.toggleTorch()
        let data = try session.saveData()
        let continued = try GameSession(scene: document)
        try continued.restore(data: data)
        XCTAssertEqual(continued.position, session.position)
        XCTAssertEqual(continued.doorsOpen, session.doorsOpen)
        XCTAssertEqual(continued.torchOn, session.torchOn)
        var invalid = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        invalid["sourceRevision"] = String(repeating: "c", count: 40)
        XCTAssertThrowsError(try continued.restore(data: JSONSerialization.data(withJSONObject: invalid)))
        XCTAssertEqual(continued.position, session.position)
        invalid["sourceRevision"] = document.source.revision
        invalid["position"] = [0,100,0]
        XCTAssertThrowsError(try continued.restore(data: JSONSerialization.data(withJSONObject: invalid)))
    }

    func testOcclusionAndFloorSeparationPreventRemoteSearch() throws {
        let hidden = try scene {
            $0["interactions"] = [["id":"supply_1", "kind":"container", "objectID":"supplies", "name":"supplies", "position":[0,0.8,-0.5], "itemID":"bandage"]]
            $0["colliders"] = [["id":"wall", "position":[0,0,0], "size":[8,3,0.3], "yaw":0]]
            $0["spawn"] = [0,0,1]
        }
        XCTAssertNil(try GameSession(scene: hidden).nearestInteraction)
        let upper = try scene {
            $0["interactions"] = [["id":"supply_1", "kind":"container", "objectID":"supplies", "name":"supplies", "position":[0,3.8,0], "itemID":"bandage"]]
            $0["colliders"] = [] as [[String: Any]]
            $0["spawn"] = [0,0,1]
        }
        XCTAssertNil(try GameSession(scene: upper).nearestInteraction)
    }

    func testRejectsInvalidIDsAndUnsupportedSceneVersions() throws {
        XCTAssertThrowsError(try scene { $0["version"] = 9 })
        XCTAssertThrowsError(try scene { $0["source"] = ["revision":"not-a-revision", "worldSHA256":"bad"] })
        XCTAssertThrowsError(try scene { $0["items"] = [] as [[String: Any]] })
        XCTAssertThrowsError(try scene { $0["spawn"] = [0,0] })
    }


    private func importedScene() throws -> SceneDocument {
        let bundle = Bundle(for: CoreTests.self)
        let bundled = bundle.url(forResource: "scene", withExtension: "json", subdirectory: "NativeContent")
        let local = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("NativeContent/scene.json")
        return try SceneDocument.load(data: Data(contentsOf: bundled ?? local))
    }

    private func face(_ session: GameSession, x: Double, z: Double) {
        let targetYaw = atan2(-(x-session.position.x), -(z-session.position.z))
        session.move(strafe: 0, forward: 0, lookYaw: targetYaw-session.yaw, deltaTime: 0)
    }

    private func walkTo(_ session: GameSession, x: Double, z: Double,
                        file: StaticString = #filePath, line: UInt = #line) {
        face(session, x: x, z: z)
        for _ in 0..<600 {
            if hypot(session.position.x-x, session.position.z-z) < 0.06 { break }
            session.move(strafe: 0, forward: 1, deltaTime: 0.02)
        }
        XCTAssertLessThan(hypot(session.position.x-x, session.position.z-z), 0.07,
                          "Blocked at \(session.position) travelling towards \(x),\(z)", file: file, line: line)
    }

    func testImportedForesterPlayableRouteDoorsSuppliesStairsAndCheckpoint() throws {
        let document = try importedScene()
        XCTAssertEqual(document.buildingID, "forester")
        XCTAssertFalse(document.stairs.isEmpty)
        let session = try GameSession(scene: document)
        // This route uses actual compiler geometry, source doors and licensed furniture.
        walk(session, forward: 1, ticks: 60)
        XCTAssertGreaterThan(session.position.z, -54.3, "Closed source door must block entrance")
        XCTAssertEqual(session.nearestInteraction?.id, "forester")
        session.interact()
        XCTAssertTrue(session.doorsOpen.contains("forester"))
        walkTo(session, x: -30, z: -57.1)
        XCTAssertEqual(session.nearestInteraction?.id, "forester_inner")
        session.interact()
        XCTAssertTrue(session.doorsOpen.contains("forester_inner"))
        walkTo(session, x: -30, z: -60.1)
        walkTo(session, x: -32.3, z: -60.1)
        face(session, x: -32.4, z: -59.25)
        XCTAssertEqual(session.nearestInteraction?.id, "forester_c1")
        session.interact()
        XCTAssertTrue(session.searched.contains("forester_c1"))
        XCTAssertNil(session.inventory["med"])
        session.interact()
        XCTAssertEqual(session.inventory["med"], 1)
        XCTAssertTrue(session.collected.contains("forester_c1"))
        XCTAssertNotEqual(session.nearestInteraction?.id, "forester_c1",
                          "A collected source container must no longer offer its supplies")
        // The nearby open kitchen door becomes the next target after collection.
        // A further use would correctly close that door, so resume walking here.
        XCTAssertTrue(session.doorsOpen.contains("forester_inner"))
        walkTo(session, x: -30, z: -60.1)
        walkTo(session, x: -30, z: -56.0)
        walkTo(session, x: -26.5, z: -55.8)
        walkTo(session, x: -26.5, z: -62.4)
        XCTAssertEqual(session.position.y, 3.2, accuracy: 0.02)
        walkTo(session, x: -28.1, z: -62.4)
        XCTAssertEqual(session.position.y, 3.2, accuracy: 0.02, "Upper landing must remain supported")
        session.toggleTorch()
        let resumed = try GameSession(scene: document)
        try resumed.restore(data: session.saveData())
        XCTAssertEqual(resumed.position, session.position)
        XCTAssertEqual(resumed.inventory["med"], 1)
        XCTAssertTrue(resumed.searched.contains("forester_c1"))
        XCTAssertFalse(resumed.torchOn)
        walkTo(resumed, x: -26.5, z: -62.4)
        walkTo(resumed, x: -26.5, z: -55.8)
        XCTAssertEqual(resumed.position.y, 0, accuracy: 0.02)
    }

    func testNativeSaveStoreUsesSeparateNamespace() throws {
        let suite = "org.fieldsignal.native.tests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        defaults.set("browser-sentinel", forKey: "field-signal-dead-air-v9")
        let session = try GameSession(scene: scene())
        session.toggleTorch()
        let store = NativeSaveStore(defaults: defaults)
        try store.save(session)
        let restored = try GameSession(scene: scene())
        try store.load(into: restored)
        XCTAssertFalse(restored.torchOn)
        store.removePrototypeCheckpoint()
        XCTAssertEqual(defaults.string(forKey: "field-signal-dead-air-v9"), "browser-sentinel")
        XCTAssertNil(defaults.data(forKey: NativeSaveStore.key))
        XCTAssertEqual(NativeSaveStore.suiteName, "org.fieldsignal.native.prototype.v1")
    }

    func testBackResumesLifecyclePauseBeforeClosingInventory() throws {
        let session = try GameSession(scene: scene())
        session.toggleInventory()
        session.setPaused(true) // App backgrounding or controller loss.
        let position = session.position
        session.move(strafe: 0, forward: 1, deltaTime: 0.1)
        XCTAssertEqual(session.position, position)

        session.handleBack()
        XCTAssertFalse(session.isPaused)
        XCTAssertTrue(session.inventoryVisible, "Resuming returns to the pack that was open before suspension.")
        session.move(strafe: 0, forward: 1, deltaTime: 0.1)
        XCTAssertEqual(session.position, position, "The visible pack must still suppress movement.")

        session.handleBack()
        XCTAssertFalse(session.isPaused)
        XCTAssertFalse(session.inventoryVisible)
        session.move(strafe: 0, forward: 1, deltaTime: 0.1)
        XCTAssertNotEqual(session.position, position)
        session.handleBack()
        XCTAssertTrue(session.isPaused)
    }
}
