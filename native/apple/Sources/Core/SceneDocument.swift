import Foundation

/// World-space metres, Y-up. Positive Y yaw rotates local +Z towards +X.
public struct Vec3: Codable, Equatable, Sendable {
    public var x: Double
    public var y: Double
    public var z: Double
    public init(_ x: Double, _ y: Double, _ z: Double) { self.x = x; self.y = y; self.z = z }
    public init(from decoder: Decoder) throws {
        var c = try decoder.unkeyedContainer()
        x = try c.decode(Double.self); y = try c.decode(Double.self); z = try c.decode(Double.self)
        guard c.isAtEnd else { throw DecodingError.dataCorruptedError(in: c, debugDescription: "A position has exactly three coordinates.") }
    }
    public func encode(to encoder: Encoder) throws {
        var c = encoder.unkeyedContainer()
        try c.encode(x); try c.encode(y); try c.encode(z)
    }
    public var isFinite: Bool { x.isFinite && y.isFinite && z.isFinite }
    public func distance(to p: Vec3) -> Double { sqrt(pow(x-p.x, 2) + pow(y-p.y, 2) + pow(z-p.z, 2)) }
}

public struct SceneSource: Codable, Sendable {
    public let revision: String
    public let worldSHA256: String
}

/// Flattened world poses; never mount these below the building transform again.
/// Floors use their top surface as Y, other objects and all colliders use bottom Y.
public struct SceneObject: Codable, Identifiable, Sendable {
    public let id: String
    public let kind: String
    public let position: Vec3
    public let size: Vec3
    public let yaw: Double
    public let assetID: String?
    public let parentID: String?
    public let doorID: String?
    public let material: String?
}

public struct SceneCollider: Codable, Identifiable, Sendable {
    public let parentID: String?
    public let id: String
    public let position: Vec3
    public let size: Vec3
    public let yaw: Double
    public let doorID: String?
}

public struct SceneStair: Codable, Identifiable, Sendable {
    public let id: String
    public let position: Vec3
    public let size: Vec3
    public let yaw: Double
}

public struct SceneInteraction: Codable, Identifiable, Sendable {
    public let id: String
    public let kind: String
    public let objectID: String
    public let name: String
    public let position: Vec3
    public let itemID: String?
}

public struct SceneItem: Codable, Identifiable, Sendable {
    public let id: String
    public let name: String
}

public enum NativeSceneError: Error, CustomStringConvertible {
    case invalid(String)
    public var description: String {
        switch self { case .invalid(let message): return message }
    }
}

public struct SceneDocument: Codable, Sendable {
    public let format: String
    public let version: Int
    public let source: SceneSource
    public let buildingID: String
    public let spawn: Vec3
    public let objects: [SceneObject]
    public let colliders: [SceneCollider]
    public let stairs: [SceneStair]
    public let interactions: [SceneInteraction]
    public let items: [SceneItem]

    public static func load(data: Data) throws -> SceneDocument {
        let scene = try JSONDecoder().decode(SceneDocument.self, from: data)
        try scene.validate()
        return scene
    }

    public func validate() throws {
        func require(_ condition: Bool, _ message: String) throws {
            if !condition { throw NativeSceneError.invalid(message) }
        }
        func unique(_ ids: [String], _ label: String) throws {
            try require(ids.allSatisfy { !$0.isEmpty } && Set(ids).count == ids.count, "Duplicate or empty \(label) ID.")
        }
        func pose(_ p: Vec3, _ size: Vec3, _ yaw: Double) -> Bool {
            p.isFinite && size.isFinite && yaw.isFinite && size.x > 0 && size.y > 0 && size.z > 0 &&
            max(abs(p.x), abs(p.y), abs(p.z)) < 10_000 && max(size.x, size.y, size.z) < 1000
        }
        try require(format == "field-signal-native-scene" && version == 1, "Unsupported native scene version.")
        try require(source.revision.range(of: "^[a-f0-9]{40}$", options: .regularExpression) != nil, "Invalid pinned source revision.")
        try require(source.worldSHA256.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil, "Invalid source digest.")
        try require(!buildingID.isEmpty && spawn.isFinite, "Invalid building or spawn.")
        try require(objects.count <= 5000 && colliders.count <= 5000 && interactions.count <= 500, "Scene budget exceeded.")
        try unique(objects.map(\.id), "object"); try unique(stairs.map(\.id), "stair")
        try unique(interactions.map(\.id), "interaction"); try unique(items.map(\.id), "item")
        try require(objects.allSatisfy { pose($0.position, $0.size, $0.yaw) }, "Invalid object pose.")
        try require(colliders.allSatisfy { pose($0.position, $0.size, $0.yaw) }, "Invalid collider pose.")
        try require(stairs.allSatisfy { pose($0.position, $0.size, $0.yaw) }, "Invalid stair pose.")
        let objectIDs = Set(objects.map(\.id)), itemIDs = Set(items.map(\.id))
        for interaction in interactions {
            try require(["door", "container", "loose"].contains(interaction.kind), "Unsupported interaction kind.")
            try require(interaction.position.isFinite && objectIDs.contains(interaction.objectID), "Interaction has no object.")
            try require(interaction.itemID == nil || itemIDs.contains(interaction.itemID!), "Interaction has no catalogue item.")
        }
        let doorIDs = Set(interactions.filter { $0.kind == "door" }.map(\.id))
        try require(colliders.allSatisfy { $0.doorID == nil || doorIDs.contains($0.doorID!) }, "Collider has an unknown door ID.")
    }
}
