import Foundation

/// Small bounded experiment, deliberately independent of the browser campaign rules.
/// Scene geometry is authoritative for rendering, walking, doors and interactions.
public final class GameSession {
    public let scene: SceneDocument
    public private(set) var position: Vec3
    public private(set) var yaw = 0.0
    public private(set) var pitch = 0.0
    public private(set) var doorsOpen = Set<String>()
    public private(set) var searched = Set<String>()
    public private(set) var collected = Set<String>()
    public private(set) var inventory: [String: Int] = [:]
    public private(set) var torchOn = true
    public private(set) var inventoryVisible = false
    public private(set) var isPaused = false
    public private(set) var status = "Explore the forester's cottage. Search supplies and try the stairs."
    public let eyeHeight = 1.62
    public let playerRadius = 0.23
    public let playerHeight = 1.72

    public init(scene: SceneDocument) throws {
        try scene.validate()
        self.scene = scene
        self.position = scene.spawn
        guard !isBlocked(at: scene.spawn) else { throw NativeSceneError.invalid("Native spawn is obstructed.") }
    }

    public func move(strafe: Double, forward: Double, lookYaw: Double = 0, lookPitch: Double = 0, deltaTime: Double) {
        guard !isPaused && !inventoryVisible,
              [strafe, forward, lookYaw, lookPitch, deltaTime].allSatisfy(\.isFinite) else { return }
        yaw = (yaw + lookYaw).truncatingRemainder(dividingBy: .pi * 2)
        pitch = min(1.2, max(-1.2, pitch + lookPitch))
        let dt = max(0, min(deltaTime, 0.1)) // resume never produces a giant movement step
        let length = max(1, hypot(strafe, forward))
        let dx = (cos(yaw) * strafe - sin(yaw) * forward) / length * 2.5 * dt
        let dz = (-sin(yaw) * strafe - cos(yaw) * forward) / length * 2.5 * dt
        let steps = max(1, Int(ceil(hypot(dx, dz) / 0.045)))
        for _ in 0..<steps {
            var candidate = position
            candidate.x += dx / Double(steps)
            candidate.y = surfaceHeight(x: candidate.x, z: candidate.z, lastY: position.y)
            if candidate.y - position.y <= 0.46 && !isBlocked(at: candidate) { position = candidate }
            candidate = position
            candidate.z += dz / Double(steps)
            candidate.y = surfaceHeight(x: candidate.x, z: candidate.z, lastY: position.y)
            if candidate.y - position.y <= 0.46 && !isBlocked(at: candidate) { position = candidate }
        }
    }

    public func toggleTorch() { guard !isPaused else { return }; torchOn.toggle() }
    public func toggleInventory() { inventoryVisible.toggle() }
    public func setPaused(_ value: Bool) { isPaused = value }

    /// Back dismisses the topmost native layer. Lifecycle/controller-loss pause
    /// can sit above an open pack; resuming must not strand that pack or move.
    public func handleBack() {
        if isPaused { isPaused = false }
        else if inventoryVisible { inventoryVisible = false }
        else { isPaused = true }
    }

    public var nearestInteraction: SceneInteraction? {
        let eye = Vec3(position.x, position.y + eyeHeight, position.z)
        return scene.interactions.filter { target in
            guard !collected.contains(target.id), eye.distance(to: target.position) <= 2.7,
                  abs(target.position.y - eye.y) < 1.7 else { return false }
            let dx = target.position.x-eye.x, dz = target.position.z-eye.z
            let horizontal = hypot(dx, dz)
            if horizontal > 0.4 && (-sin(yaw)*dx-cos(yaw)*dz) / horizontal < 0.2 { return false }
            return hasLineOfSight(from: eye, to: target.position, target: target)
        }.min { eye.distance(to: $0.position) < eye.distance(to: $1.position) }
    }

    public var interactionPrompt: String {
        guard let target = nearestInteraction else { return "Approach a door or supply container" }
        switch target.kind {
        case "door": return "\(doorsOpen.contains(target.id) ? "Close" : "Open") \(target.name)"
        case "container": return searched.contains(target.id) ? "Collect supplies · \(target.name)" : "Search \(target.name)"
        default: return "Collect \(target.name)"
        }
    }

    @discardableResult public func interact() -> String {
        guard !isPaused && !inventoryVisible, let target = nearestInteraction else { return status }
        if target.kind == "door" {
            if doorsOpen.contains(target.id) {
                // Do not trap a player inside a leaf when closing from the threshold.
                let leafColliders = scene.colliders.filter { $0.doorID == target.id }
                if leafColliders.contains(where: { overlaps($0, at: position, radius: playerRadius) }) {
                    status = "Step clear of the doorway before closing it."
                    return status
                }
                doorsOpen.remove(target.id)
                status = "Closed \(target.name)."
            } else {
                doorsOpen.insert(target.id)
                status = "Opened \(target.name)."
            }
        } else if target.kind == "container" && !searched.contains(target.id) {
            searched.insert(target.id)
            if let item = target.itemID, let name = scene.items.first(where: { $0.id == item })?.name {
                status = "Found \(name). Interact again to collect it."
            } else { collected.insert(target.id); status = "The container is empty." }
        } else if let item = target.itemID {
            searched.insert(target.id)
            collected.insert(target.id)
            inventory[item, default: 0] += 1
            status = "Collected \(scene.items.first(where: { $0.id == item })?.name ?? item)."
        }
        return status
    }

    /// Stairs rise towards their local -Z; exported floor pieces retain the stair opening.
    public func surfaceHeight(x: Double, z: Double, lastY: Double) -> Double {
        for stair in scene.stairs {
            let p = local(x: x, z: z, origin: stair.position, yaw: stair.yaw)
            if abs(p.x) <= stair.size.x/2 - 0.06 && p.z >= -stair.size.z/2 - 0.25 && p.z <= stair.size.z/2 + 0.25 {
                let height = stair.position.y + min(1, max(0, (stair.size.z/2-p.z)/stair.size.z)) * stair.size.y
                if abs(lastY-height) < 0.65 || (lastY >= stair.position.y && p.z > stair.size.z/2 - 0.25) {
                    return height
                }
            }
        }
        var result = scene.terrain?.height(x: x, z: z) ?? 0.0
        for floor in scene.objects where floor.kind == "floor" {
            let p = local(x: x, z: z, origin: floor.position, yaw: floor.yaw)
            if abs(p.x) <= floor.size.x/2 && abs(p.z) <= floor.size.z/2 && floor.position.y <= lastY + 0.46 {
                result = max(result, floor.position.y)
            }
        }
        return result
    }

    public func isBlocked(at point: Vec3) -> Bool {
        // An explicit bounded garden avoids walking off the imported scene.
        let outdoor = scene.objects.first { $0.id == "native-outdoor" }
        if let outdoor = outdoor {
            let p = local(x: point.x, z: point.z, origin: outdoor.position, yaw: outdoor.yaw)
            if abs(p.x) > outdoor.size.x/2-playerRadius || abs(p.z) > outdoor.size.z/2-playerRadius { return true }
        }
        // Rendered stairs are solid beneath the treads. A low player cannot enter
        // the high end or side and pass through their volume at ground level.
        for stair in scene.stairs {
            let q = local(x: point.x, z: point.z, origin: stair.position, yaw: stair.yaw)
            if abs(q.x) < stair.size.x/2 + playerRadius && abs(q.z) < stair.size.z/2 {
                let ramp = stair.position.y + (stair.size.z/2-q.z)/stair.size.z*stair.size.y
                if point.y < ramp - 0.46 && point.y + playerHeight > stair.position.y { return true }
            }
        }
        return scene.colliders.contains { collider in
            if let door = collider.doorID, doorsOpen.contains(door) { return false }
            return overlaps(collider, at: point, radius: playerRadius)
        }
    }

    private func overlaps(_ c: SceneCollider, at p: Vec3, radius: Double) -> Bool {
        guard c.position.y + c.size.y > p.y + 0.08 && c.position.y < p.y + playerHeight else { return false }
        let q = local(x: p.x, z: p.z, origin: c.position, yaw: c.yaw)
        let dx = max(abs(q.x) - c.size.x/2, 0), dz = max(abs(q.z) - c.size.z/2, 0)
        return dx*dx + dz*dz < radius*radius
    }

    private func local(x: Double, z: Double, origin: Vec3, yaw: Double) -> (x: Double, z: Double) {
        let dx = x-origin.x, dz = z-origin.z
        return (dx*cos(yaw)-dz*sin(yaw), dx*sin(yaw)+dz*cos(yaw))
    }

    private func hasLineOfSight(from a: Vec3, to b: Vec3, target: SceneInteraction) -> Bool {
        // Slab-test the sight segment in each collider's local frame, excluding the target itself.
        for c in scene.colliders {
            if c.id == target.objectID || c.parentID == target.objectID || c.id.hasPrefix(target.objectID + ":") || c.doorID == target.id { continue }
            if let door = c.doorID, doorsOpen.contains(door) { continue }
            let start = local(x: a.x, z: a.z, origin: c.position, yaw: c.yaw)
            let end = local(x: b.x, z: b.z, origin: c.position, yaw: c.yaw)
            let origins = [start.x, a.y-c.position.y, start.z]
            let directions = [end.x-start.x, b.y-a.y, end.z-start.z]
            let lower = [-c.size.x/2, 0, -c.size.z/2], upper = [c.size.x/2, c.size.y, c.size.z/2]
            var minimum = 0.02, maximum = 0.98
            var intersects = true
            for axis in 0..<3 {
                if abs(directions[axis]) < 0.000001 {
                    if origins[axis] < lower[axis] || origins[axis] > upper[axis] { intersects = false; break }
                } else {
                    let t1 = (lower[axis]-origins[axis])/directions[axis]
                    let t2 = (upper[axis]-origins[axis])/directions[axis]
                    minimum = max(minimum, min(t1, t2)); maximum = min(maximum, max(t1, t2))
                    if minimum > maximum { intersects = false; break }
                }
            }
            if intersects { return false }
        }
        return true
    }

    public func saveData() throws -> Data {
        try JSONEncoder().encode(NativeSave(version: 1, sourceRevision: scene.source.revision, buildingID: scene.buildingID,
            position: position, yaw: yaw, pitch: pitch, doorsOpen: doorsOpen, searched: searched,
            collected: collected, inventory: inventory, torchOn: torchOn))
    }

    /// Reject incompatible or corrupt saves without mutating the current session.
    public func restore(data: Data) throws {
        let save = try JSONDecoder().decode(NativeSave.self, from: data)
        let doorIDs = Set(scene.interactions.filter { $0.kind == "door" }.map(\.id))
        let supplyIDs = Set(scene.interactions.filter { $0.kind != "door" }.map(\.id))
        let itemIDs = Set(scene.items.map(\.id))
        guard save.version == 1, save.sourceRevision == scene.source.revision, save.buildingID == scene.buildingID,
              save.position.isFinite, save.yaw.isFinite, save.pitch.isFinite,
              abs(save.pitch) <= 1.2, save.doorsOpen.isSubset(of: doorIDs),
              save.searched.isSubset(of: supplyIDs), save.collected.isSubset(of: save.searched),
              Set(save.inventory.keys).isSubset(of: itemIDs), save.inventory.values.allSatisfy({ $0 > 0 && $0 <= 500 }),
              abs(surfaceHeight(x: save.position.x, z: save.position.z, lastY: save.position.y)-save.position.y) < 0.65
        else { throw NativeSceneError.invalid("The native prototype save is invalid or belongs to another source scene.") }
        let previousDoors = doorsOpen
        doorsOpen = save.doorsOpen
        guard !isBlocked(at: save.position) else {
            doorsOpen = previousDoors
            throw NativeSceneError.invalid("The saved position is obstructed.")
        }
        position = save.position; yaw = save.yaw; pitch = save.pitch
        searched = save.searched; collected = save.collected; inventory = save.inventory; torchOn = save.torchOn
        status = "Continued the native prototype checkpoint."
    }
}

private struct NativeSave: Codable {
    let version: Int
    let sourceRevision: String
    let buildingID: String
    let position: Vec3
    let yaw: Double
    let pitch: Double
    let doorsOpen: Set<String>
    let searched: Set<String>
    let collected: Set<String>
    let inventory: [String: Int]
    let torchOn: Bool
}

/// Separate native-only domain. No browser campaign, settings or editor keys are read.
public final class NativeSaveStore {
    public static let suiteName = "org.fieldsignal.native.prototype.v1"
    public static let key = "native-scene-checkpoint-v1"
    private let defaults: UserDefaults
    public init(defaults: UserDefaults? = UserDefaults(suiteName: NativeSaveStore.suiteName)) {
        self.defaults = defaults ?? .standard
    }
    public func load(into session: GameSession) throws {
        if let data = defaults.data(forKey: Self.key) { try session.restore(data: data) }
    }
    public func save(_ session: GameSession) throws { defaults.set(try session.saveData(), forKey: Self.key) }
    public func removePrototypeCheckpoint() { defaults.removeObject(forKey: Self.key) }
}
