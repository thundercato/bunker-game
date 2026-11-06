import SceneKit
import UIKit

/// Rendering is a projection of the same exported geometry used by Core collision.
/// All exported positions are already world-space; no second building transform is applied.
final class NativeScene {
    let scene = SCNScene()
    let camera = SCNNode()
    private let torch = SCNNode()
    private var doors: [String: (pivot: SCNNode, closedYaw: Float)] = [:]
    private var lastDoors: Set<String> = []
    private var objectNodes: [String: SCNNode] = [:]
    private var looseObjects: [String: String] = [:]

    private struct MeshFile: Decodable {
        let dimensions: [Double]
        let meshes: [Mesh]
    }
    private struct Mesh: Decodable {
        let positions: [Float]
        let normals: [Float]
        let colors: [Float]?
        let indices: [Int32]
        let baseColor: [Double]?
        let uvs: [Float]?
        let texture: String?
        let alphaMode: String?
        let alphaCutoff: Double?
        let doubleSided: Bool?
    }

    init(document: SceneDocument, resourceURL: URL) throws {
        for interaction in document.interactions where interaction.kind == "loose" {
            // The binding object is a reusable table, not the removable item.
            looseObjects[interaction.id] = "native-loot-" + interaction.id
        }
        scene.background.contents = UIColor(red: 0.18, green: 0.23, blue: 0.25, alpha: 1)
        scene.fogColor = UIColor(red: 0.25, green: 0.29, blue: 0.28, alpha: 1)
        scene.fogStartDistance = 20
        scene.fogEndDistance = 68
        scene.lightingEnvironment.intensity = 0.45

        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.color = UIColor(red: 0.61, green: 0.69, blue: 0.72, alpha: 1)
        ambient.light?.intensity = 440
        scene.rootNode.addChildNode(ambient)

        let sun = SCNNode()
        sun.light = SCNLight()
        sun.light?.type = .directional
        sun.light?.intensity = 900
        sun.light?.color = UIColor(red: 0.93, green: 0.83, blue: 0.66, alpha: 1)
        sun.light?.castsShadow = true
        sun.light?.shadowMapSize = CGSize(width: 1024, height: 1024)
        sun.light?.shadowRadius = 3
        sun.eulerAngles = SCNVector3(-0.85, -0.5, 0)
        scene.rootNode.addChildNode(sun)

        camera.camera = SCNCamera()
        camera.camera?.fieldOfView = 72
        camera.camera?.zNear = 0.05
        camera.camera?.zFar = 100
        camera.camera?.wantsHDR = true
        camera.camera?.exposureOffset = 0.2
        scene.rootNode.addChildNode(camera)

        torch.light = SCNLight()
        torch.light?.type = .spot
        torch.light?.color = UIColor(red: 1, green: 0.88, blue: 0.66, alpha: 1)
        torch.light?.intensity = 1600
        torch.light?.spotInnerAngle = 20
        torch.light?.spotOuterAngle = 58
        torch.light?.attenuationStartDistance = 1
        torch.light?.attenuationEndDistance = 22
        torch.position = SCNVector3(0.2, -0.12, -0.15)
        camera.addChildNode(torch)

        for object in document.objects { try add(object, resourceURL: resourceURL) }
    }

    func update(position: Vec3, yaw: Double, pitch: Double, torchOn: Bool, doorsOpen: Set<String>, collected: Set<String>) {
        camera.position = SCNVector3(Float(position.x), Float(position.y + 1.65), Float(position.z))
        camera.eulerAngles = SCNVector3(Float(pitch), Float(yaw), 0)
        torch.isHidden = !torchOn
        for (id, objectID) in looseObjects { objectNodes[objectID]?.isHidden = collected.contains(id) }
        if lastDoors != doorsOpen {
            SCNTransaction.begin()
            SCNTransaction.animationDuration = 0.25
            for (id, door) in doors {
                door.pivot.eulerAngles.y = door.closedYaw + (doorsOpen.contains(id) ? .pi / 2 : 0)
            }
            SCNTransaction.commit()
            lastDoors = doorsOpen
        }
    }

    private func add(_ object: SceneObject, resourceURL: URL) throws {
        if object.kind == "spawn" { return }
        if object.kind == "light" {
            let node = SCNNode()
            node.position = vector(object.position)
            node.light = SCNLight()
            node.light?.type = .omni
            node.light?.intensity = 140
            node.light?.color = UIColor(red: 1, green: 0.82, blue: 0.56, alpha: 1)
            node.light?.attenuationEndDistance = 7
            scene.rootNode.addChildNode(node)
            return
        }
        let node = SCNNode()
        node.name = object.id
        node.position = vector(object.position)
        node.eulerAngles.y = Float(object.yaw)
        if let assetID = object.assetID {
            // Asset names come from the validated allow-list, never imported executable paths.
            let meshURL = resourceURL.appendingPathComponent("Meshes").appendingPathComponent(assetID + ".json")
            let mesh = try JSONDecoder().decode(MeshFile.self, from: Data(contentsOf: meshURL))
            let model = meshNode(mesh, resourceURL: resourceURL)
            model.scale = SCNVector3(Float(object.size.x / mesh.dimensions[0]),
                                    Float(object.size.y / mesh.dimensions[1]),
                                    Float(object.size.z / mesh.dimensions[2]))
            node.addChildNode(model)
        } else if object.kind == "loot" {
            // Existing wire catalogue item, shown as a native coil marker above its authored surface.
            let coil = SCNTorus(ringRadius: object.size.x / 3, pipeRadius: object.size.y / 3)
            node.geometry = coil
            node.position.y += Float(object.size.y / 2)
            node.geometry?.firstMaterial = material("copper")
        } else if object.kind == "stairs" {
            let steps = max(4, Int(ceil(object.size.y / 0.18)))
            for index in 0..<steps {
                let step = SCNNode(geometry: SCNBox(width: object.size.x,
                    height: object.size.y * Double(index + 1) / Double(steps),
                    length: object.size.z / Double(steps), chamferRadius: 0))
                step.position = SCNVector3(0, Float(object.size.y * Double(index + 1) / Double(steps) / 2),
                    Float(object.size.z / 2 - object.size.z * (Double(index) + 0.5) / Double(steps)))
                step.geometry?.firstMaterial = material(object.material)
                node.addChildNode(step)
            }
        } else {
            node.geometry = SCNBox(width: object.size.x, height: object.size.y, length: object.size.z, chamferRadius: 0)
            node.geometry?.firstMaterial = material(object.material)
            // Floors are top-centred; every other primitive is bottom-centred.
            node.pivot = SCNMatrix4MakeTranslation(0, Float(object.kind == "floor" ? object.size.y / 2 : -object.size.y / 2), 0)
        }
        objectNodes[object.id] = node
        if object.kind == "door", let id = object.doorID {
            let pivot = SCNNode()
            let half = object.size.x / 2
            pivot.position = SCNVector3(Float(object.position.x - cos(object.yaw) * half),
                Float(object.position.y), Float(object.position.z + sin(object.yaw) * half))
            pivot.eulerAngles.y = Float(object.yaw)
            node.position = SCNVector3(Float(half), 0, 0)
            node.eulerAngles.y = 0
            pivot.addChildNode(node)
            scene.rootNode.addChildNode(pivot)
            doors[id] = (pivot, Float(object.yaw))
        } else { scene.rootNode.addChildNode(node) }
    }

    private func meshNode(_ mesh: MeshFile, resourceURL: URL) -> SCNNode {
        let root = SCNNode()
        for part in mesh.meshes {
            let points = stride(from: 0, to: part.positions.count, by: 3).map {
                SCNVector3(part.positions[$0], part.positions[$0 + 1], part.positions[$0 + 2])
            }
            let normals = stride(from: 0, to: part.normals.count, by: 3).map {
                SCNVector3(part.normals[$0], part.normals[$0 + 1], part.normals[$0 + 2])
            }
            var sources = [SCNGeometrySource(vertices: points), SCNGeometrySource(normals: normals)]
            if let colours = part.colors, colours.count == points.count * 4 {
                let data = colours.withUnsafeBytes { Data($0) }
                sources.append(SCNGeometrySource(data: data, semantic: .color, vectorCount: points.count,
                    usesFloatComponents: true, componentsPerVector: 4, bytesPerComponent: 4, dataOffset: 0, dataStride: 16))
            }
            if let uvs = part.uvs, uvs.count == points.count * 2 {
                let data = uvs.withUnsafeBytes { Data($0) }
                sources.append(SCNGeometrySource(data: data, semantic: .texcoord, vectorCount: points.count,
                    usesFloatComponents: true, componentsPerVector: 2, bytesPerComponent: 4, dataOffset: 0, dataStride: 8))
            }
            let data = part.indices.withUnsafeBytes { Data($0) }
            let element = SCNGeometryElement(data: data, primitiveType: .triangles,
                primitiveCount: part.indices.count / 3, bytesPerIndex: MemoryLayout<Int32>.size)
            let geometry = SCNGeometry(sources: sources, elements: [element])
            let appearance = SCNMaterial()
            appearance.lightingModel = .physicallyBased
            let colour = part.baseColor ?? [1, 1, 1, 1]
            if let texture = part.texture {
                appearance.diffuse.contents = UIImage(contentsOfFile: resourceURL.appendingPathComponent("Textures").appendingPathComponent(texture).path)
            } else {
                appearance.diffuse.contents = UIColor(red: colour[0], green: colour[1], blue: colour[2], alpha: colour.count > 3 ? colour[3] : 1)
            }
            appearance.roughness.contents = 0.85
            appearance.isDoubleSided = part.doubleSided ?? false
            if part.alphaMode == "MASK" {
                appearance.transparencyMode = .aOne
                appearance.writesToDepthBuffer = true
                // Keep source alpha cut-out foliage rather than an opaque card.
                appearance.shaderModifiers = [.fragment: "if (_output.color.a < \(part.alphaCutoff ?? 0.5)) { discard_fragment(); }"]
            }
            geometry.firstMaterial = appearance
            root.addChildNode(SCNNode(geometry: geometry))
        }
        return root
    }

    private func vector(_ value: Vec3) -> SCNVector3 { SCNVector3(Float(value.x), Float(value.y), Float(value.z)) }

    private func material(_ name: String?) -> SCNMaterial {
        let colours: [String: UIColor] = [
            "plaster": UIColor(red: 0.52, green: 0.51, blue: 0.43, alpha: 1),
            "brick": UIColor(red: 0.38, green: 0.25, blue: 0.20, alpha: 1),
            "wood": UIColor(red: 0.34, green: 0.25, blue: 0.16, alpha: 1),
            "concrete": UIColor(red: 0.38, green: 0.40, blue: 0.37, alpha: 1),
            "metal": UIColor(red: 0.29, green: 0.33, blue: 0.31, alpha: 1),
            "roof": UIColor(red: 0.23, green: 0.25, blue: 0.23, alpha: 1),
            "copper": UIColor(red: 0.68, green: 0.39, blue: 0.15, alpha: 1),
            "grass": UIColor(red: 0.24, green: 0.29, blue: 0.18, alpha: 1)
        ]
        let result = SCNMaterial()
        result.lightingModel = .physicallyBased
        result.diffuse.contents = colours[name ?? "plaster"] ?? colours["plaster"]
        result.roughness.contents = 0.94
        return result
    }
}
