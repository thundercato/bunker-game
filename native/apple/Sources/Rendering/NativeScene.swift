import SceneKit
import UIKit

/// Rendering is a projection of the same exported geometry used by Core collision.
/// All exported positions are already world-space; no second building transform is applied.
final class NativeScene {
    let scene = SCNScene()
    let camera = SCNNode()
    private var models: [String: (SCNNode, [Double])] = [:]
    private var materialCache: [String: SCNMaterial] = [:]
    private var resources: URL!
    private var detailNodes: [SCNNode] = []
    private var cullClock = 0
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
        let roughness: Double?
        let metallic: Double?
        let normalTexture: String?
        let ormTexture: String?
        let occlusionTexture: String?
    }

    init(document: SceneDocument, resourceURL: URL) throws {
        resources = resourceURL
        for interaction in document.interactions where interaction.kind == "loose" {
            // The binding object is a reusable table, not the removable item.
            looseObjects[interaction.id] = "native-loot-" + interaction.id
        }
        scene.background.contents = UIColor(red: 0.18, green: 0.23, blue: 0.25, alpha: 1)
        scene.fogColor = UIColor(red: 0.25, green: 0.29, blue: 0.28, alpha: 1)
        scene.fogStartDistance = 45
        scene.fogEndDistance = 125
        let sky = UIGraphicsImageRenderer(size: CGSize(width:128,height:64)).image { context in
            let colours = [UIColor(red:0.28,green:0.38,blue:0.46,alpha:1).cgColor,
                           UIColor(red:0.62,green:0.64,blue:0.57,alpha:1).cgColor,
                           UIColor(red:0.12,green:0.16,blue:0.10,alpha:1).cgColor]
            if let gradient = CGGradient(colorsSpace:CGColorSpaceCreateDeviceRGB(),colors:colours as CFArray,locations:[0,0.55,1]) {
                context.cgContext.drawLinearGradient(gradient,start:CGPoint(x:0,y:0),end:CGPoint(x:0,y:64),options:[])
            }
        }
        scene.lightingEnvironment.contents = sky
        scene.lightingEnvironment.intensity = 0.6

        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.color = UIColor(red: 0.61, green: 0.69, blue: 0.72, alpha: 1)
        ambient.light?.intensity = 180
        scene.rootNode.addChildNode(ambient)

        let sun = SCNNode()
        sun.light = SCNLight()
        sun.light?.type = .directional
        sun.light?.intensity = 1100
        sun.light?.color = UIColor(red: 0.93, green: 0.83, blue: 0.66, alpha: 1)
        sun.light?.castsShadow = true
        sun.light?.shadowMapSize = CGSize(width: 1024, height: 1024)
        sun.light?.shadowRadius = 2
        sun.light?.shadowMode = .deferred
        sun.light?.maximumShadowDistance = 45
        sun.eulerAngles = SCNVector3(-0.85, -0.5, 0)
        scene.rootNode.addChildNode(sun)

        camera.camera = SCNCamera()
        camera.camera?.fieldOfView = 72
        camera.camera?.zNear = 0.05
        camera.camera?.zFar = 150
        camera.camera?.wantsHDR = true
        camera.camera?.exposureOffset = -0.4
        camera.camera?.wantsExposureAdaptation = true
        camera.camera?.minimumExposure = -1
        camera.camera?.maximumExposure = 0.5
        camera.camera?.screenSpaceAmbientOcclusionIntensity = 0.45
        camera.camera?.screenSpaceAmbientOcclusionRadius = 0.35
        camera.camera?.screenSpaceAmbientOcclusionSampleCount = 8
        scene.rootNode.addChildNode(camera)

        torch.light = SCNLight()
        torch.light?.type = .spot
        torch.light?.color = UIColor(red: 1, green: 0.88, blue: 0.66, alpha: 1)
        torch.light?.intensity = 80
        torch.light?.spotInnerAngle = 20
        torch.light?.spotOuterAngle = 58
        torch.light?.attenuationStartDistance = 0.25
        torch.light?.attenuationEndDistance = 14
        torch.position = SCNVector3(0.2, -0.12, -0.15)
        camera.addChildNode(torch)

        if let terrain = document.terrain { addTerrain(terrain, roads: document.roads ?? []) }
        for object in document.objects { try add(object, resourceURL: resourceURL) }
    }

    func update(position: Vec3, yaw: Double, pitch: Double, torchOn: Bool, doorsOpen: Set<String>, collected: Set<String>) {
        cullClock += 1
        if cullClock % 15 == 0 {
            for node in detailNodes {
                let dx = Double(node.position.x)-position.x, dz = Double(node.position.z)-position.z
                node.isHidden = dx*dx+dz*dz > 100*100
            }
        }
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
        if object.id == "native-outdoor" { return }
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
            if models[assetID] == nil {
                let url = resourceURL.appendingPathComponent("Meshes/"+assetID+".json")
                let mesh = try JSONDecoder().decode(MeshFile.self, from: Data(contentsOf: url))
                models[assetID] = (meshNode(mesh, resourceURL: resourceURL), mesh.dimensions)
            }
            let cached = models[assetID]!
            let model = cached.0.clone() // clones share immutable geometry and texture buffers
            model.scale = SCNVector3(Float(object.size.x/cached.1[0]), Float(object.size.y/cached.1[1]), Float(object.size.z/cached.1[2]))
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
            node.geometry?.firstMaterial = material(object.kind == "door" ? "wood" : object.material)
            if let base = node.geometry?.firstMaterial {
                let sizes = [(object.size.x,object.size.y),(object.size.z,object.size.y),(object.size.x,object.size.y),(object.size.z,object.size.y),(object.size.x,object.size.z),(object.size.x,object.size.z)]
                node.geometry?.materials = sizes.map { width, height in
                    let face = base.copy() as! SCNMaterial
                    face.diffuse.contentsTransform = SCNMatrix4MakeScale(Float(width/2),Float(height/2),1)
                    return face
                }
            }
            // Floors are top-centred; every other primitive is bottom-centred.
            node.pivot = SCNMatrix4MakeTranslation(0, Float(object.kind == "floor" ? object.size.y / 2 : -object.size.y / 2), 0)
        }
        if object.id.hasPrefix("native-forest-") { detailNodes.append(node) }
        objectNodes[object.id] = node
        if object.kind == "door", let id = object.doorID {
            let pivot = SCNNode()
            let half = object.size.x / 2
            pivot.position = SCNVector3(Float(object.position.x - cos(object.yaw) * half),
                Float(object.position.y), Float(object.position.z + sin(object.yaw) * half))
            pivot.eulerAngles.y = Float(object.yaw)
            node.position = SCNVector3(Float(half), 0, 0)
            node.eulerAngles.y = 0
            let handle = SCNNode(geometry: SCNBox(width: 0.16, height: 0.035, length: 0.05, chamferRadius: 0.01))
            handle.position = SCNVector3(Float(half*0.7),Float(-object.size.y/2+1.1),0.08)
            handle.geometry?.firstMaterial = material("metal"); node.addChildNode(handle)
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
            appearance.roughness.contents = part.roughness ?? 0.85
            appearance.metalness.contents = part.metallic ?? 0
            if let name = part.normalTexture { appearance.normal.contents = UIImage(contentsOfFile: resourceURL.appendingPathComponent("Textures/"+name).path) }
            if let name = part.ormTexture {
                let image = UIImage(contentsOfFile: resourceURL.appendingPathComponent("Textures/"+name).path)
                appearance.roughness.contents = image; appearance.roughness.textureComponents = .green
                appearance.metalness.contents = image; appearance.metalness.textureComponents = .blue
            }
            if let name = part.occlusionTexture { appearance.ambientOcclusion.contents = UIImage(contentsOfFile: resourceURL.appendingPathComponent("Textures/"+name).path); appearance.ambientOcclusion.textureComponents = .red }
            appearance.diffuse.mipFilter = .linear
            appearance.diffuse.maxAnisotropy = 4
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

    private func addTerrain(_ t: SceneTerrain, roads: [[Vec3]]) {
        var points: [SCNVector3] = [], uv: [CGPoint] = [], indices: [Int32] = []
        for z in 0..<t.rows { for x in 0..<t.columns {
            points.append(SCNVector3(Float(t.origin.x+Double(x)*t.spacing), Float(t.heights[z*t.columns+x]+t.origin.y), Float(t.origin.z+Double(z)*t.spacing)))
            uv.append(CGPoint(x: Double(x)/6, y: Double(z)/6))
            if x < t.columns-1 && z < t.rows-1 {
                let a = Int32(z*t.columns+x), b = a+1, c = a+Int32(t.columns), d = c+1
                indices += [a,c,b,b,c,d]
            }
        }}
        var normals = Array(repeating: SCNVector3(0,1,0), count: points.count)
        for z in 1..<t.rows-1 { for x in 1..<t.columns-1 {
            let dx = (t.heights[z*t.columns+x+1]-t.heights[z*t.columns+x-1])/(2*t.spacing)
            let dz = (t.heights[(z+1)*t.columns+x]-t.heights[(z-1)*t.columns+x])/(2*t.spacing)
            let length = sqrt(dx*dx+dz*dz+1); normals[z*t.columns+x] = SCNVector3(Float(-dx/length),Float(1/length),Float(-dz/length))
        }}
        let geometry = SCNGeometry(sources: [SCNGeometrySource(vertices: points),SCNGeometrySource(normals: normals),SCNGeometrySource(textureCoordinates: uv)], elements: [SCNGeometryElement(indices: indices, primitiveType: .triangles)])
        geometry.firstMaterial = material("earth")
        let terrain = SCNNode(geometry: geometry); terrain.name = "runtime-terrain"; scene.rootNode.addChildNode(terrain)
        // Roads sample the same triangles; no independent flat collision plane.
        for road in roads { for i in 1..<road.count {
            let a = road[i-1], b = road[i], length = hypot(b.x-a.x,b.z-a.z)
            let count = max(1,Int(ceil(length/2)))
            for n in 0..<count {
                let f = (Double(n)+0.5)/Double(count), x = a.x+(b.x-a.x)*f, z = a.z+(b.z-a.z)*f
                if x < t.origin.x || z < t.origin.z || x > t.origin.x+Double(t.columns-1)*t.spacing || z > t.origin.z+Double(t.rows-1)*t.spacing { continue }
                let tile = SCNNode(geometry: SCNBox(width: 4, height: 0.025, length: length/Double(count)+0.05, chamferRadius: 0))
                tile.position = SCNVector3(Float(x),Float(t.height(x:x,z:z)+0.02),Float(z)); tile.eulerAngles.y = Float(atan2(b.x-a.x,b.z-a.z))
                tile.geometry?.firstMaterial = material("gravel"); scene.rootNode.addChildNode(tile)
            }
        }}
    }

    private func vector(_ value: Vec3) -> SCNVector3 { SCNVector3(Float(value.x), Float(value.y), Float(value.z)) }

    private func material(_ name: String?) -> SCNMaterial {
        let key = name ?? "plaster"
        if let cached = materialCache[key] { return cached }
        let colours: [String: UIColor] = [
            "plaster": UIColor(red: 0.52, green: 0.51, blue: 0.43, alpha: 1),
            "brick": UIColor(red: 0.38, green: 0.25, blue: 0.20, alpha: 1),
            "wood": UIColor(red: 0.34, green: 0.25, blue: 0.16, alpha: 1),
            "concrete": UIColor(red: 0.38, green: 0.40, blue: 0.37, alpha: 1),
            "metal": UIColor(red: 0.29, green: 0.33, blue: 0.31, alpha: 1),
            "roof": UIColor(red: 0.23, green: 0.25, blue: 0.23, alpha: 1),
            "copper": UIColor(red: 0.68, green: 0.39, blue: 0.15, alpha: 1),
            "earth": UIColor(red: 0.25, green: 0.29, blue: 0.19, alpha: 1),
            "gravel": UIColor(red: 0.37, green: 0.35, blue: 0.29, alpha: 1),
            "grass": UIColor(red: 0.24, green: 0.29, blue: 0.18, alpha: 1)
        ]
        let result = SCNMaterial()
        result.lightingModel = .physicallyBased
        result.diffuse.contents = colours[name ?? "plaster"] ?? colours["plaster"]
        result.roughness.contents = key == "metal" || key == "copper" ? 0.55 : 0.94
        result.metalness.contents = key == "metal" || key == "copper" ? 0.8 : 0
        let surface = ["plaster":"wall", "brick":"wall", "concrete":"wall", "wood":"wood", "earth":"ground", "grass":"ground", "gravel":"ground", "roof":"wood"][key]
        if let surface = surface {
            result.diffuse.contents = UIImage(contentsOfFile: resources.appendingPathComponent("Textures/surface-"+surface+".jpg").path)
            result.diffuse.wrapS = .repeat; result.diffuse.wrapT = .repeat
            result.diffuse.mipFilter = .linear; result.diffuse.maxAnisotropy = 4
            result.diffuse.contentsTransform = SCNMatrix4MakeScale(3, 3, 1)
        }
        materialCache[key] = result
        return result
    }
}
