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
        walk(session, forward: 1, ticks: 25)
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
}
