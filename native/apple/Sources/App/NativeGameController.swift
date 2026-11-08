import SwiftUI
import SceneKit
import GameController
import Darwin

@MainActor
final class NativeGameController: NSObject, ObservableObject {
    @Published var status = "Loading Forester’s cottage…"
    @Published var interaction = "Explore the cottage"
    @Published var inventory: [String: Int] = [:]
    @Published var inventoryVisible = false
    @Published var paused = false
    @Published var torchOn = false
    @Published var controllerName = "Touch controls"
    @Published var loadingError: String?
    @Published var checkpointStatus = "Native checkpoints use a separate experimental save."
    private(set) var game: GameSession?
    private(set) var rendering: NativeScene?
    private var displayLink: CADisplayLink?
    private var previousTime: CFTimeInterval = 0
    private var gamepad: GCExtendedGamepad?
    private var buttonsHeld: Set<String> = []
    private var touchMove = SIMD2<Double>(0, 0)
    private var pendingLook = SIMD2<Double>(0, 0)
    private var inactive = false
    private var intervals: [Double] = []
    private var processing: [Double] = []
    private var loadingMilliseconds = 0.0
    private var metricFrames = 0
    private var uiElapsed = 0.0
    private let saveStore = NativeSaveStore()
    private let isUITesting = ProcessInfo.processInfo.arguments.contains("--uitesting")

    override init() {
        super.init()
        let loadStart = CACurrentMediaTime()
        do {
            guard let resourceRoot = Bundle.main.resourceURL else { throw CocoaError(.fileNoSuchFile) }
            let url = resourceRoot.appendingPathComponent("NativeContent/scene.json")
            let scene = try JSONDecoder().decode(SceneDocument.self, from: Data(contentsOf: url))
            game = try GameSession(scene: scene)
            if !isUITesting, let game {
                do { try saveStore.load(into: game) }
                catch { checkpointStatus = "Checkpoint preserved but could not be loaded: \(error.localizedDescription)" }
            }
            rendering = try NativeScene(document: scene, resourceURL: url.deletingLastPathComponent())
            loadingMilliseconds = (CACurrentMediaTime()-loadStart)*1000
            refresh()
            NotificationCenter.default.addObserver(self, selector: #selector(controllersChanged), name: .GCControllerDidConnect, object: nil)
            NotificationCenter.default.addObserver(self, selector: #selector(controllerLost), name: .GCControllerDidDisconnect, object: nil)
            controllersChanged()
            let link = CADisplayLink(target: self, selector: #selector(frame(_:)))
            link.add(to: .main, forMode: .common)
            displayLink = link
        } catch {
            loadingError = "The native scene could not load: \(error.localizedDescription)"
        }
    }

    @objc private func controllersChanged() {
        gamepad = GCController.controllers().compactMap(\.extendedGamepad).first
        controllerName = gamepad?.controller?.vendorName ?? {
            #if os(tvOS)
            return "Connect a game controller to explore"
            #else
            return "Touch controls · controller supported"
            #endif
        }()
        buttonsHeld.removeAll()
    }

    @objc private func controllerLost() {
        controllersChanged()
        touchMove = .zero
        pendingLook = .zero
        setPaused(true)
    }

    @objc private func frame(_ link: CADisplayLink) {
        guard let game, let rendering else { return }
        let frameStart = CACurrentMediaTime()
        if previousTime > 0 && isUITesting { intervals.append((link.timestamp-previousTime)*1000); if intervals.count > 600 { intervals.removeFirst() } }
        let dt = min(0.1, previousTime == 0 ? 1.0 / 60.0 : link.timestamp - previousTime)
        previousTime = link.timestamp
        if !inactive, let pad = gamepad {
            #if os(tvOS)
            // SwiftUI owns focused menu activation and Back. Exploration has no
            // focusable buttons, so a physical A press reaches only this path.
            if !paused && !inventoryVisible {
                edge("inventory", pad.buttonY.isPressed) { self.toggleInventory() }
                edge("torch", pad.buttonX.isPressed) { self.toggleTorch() }
                edge("interact", pad.buttonA.isPressed) { self.interact() }
            } else {
                if !pad.buttonY.isPressed { buttonsHeld.remove("inventory") }
                if !pad.buttonX.isPressed { buttonsHeld.remove("torch") }
                if !pad.buttonA.isPressed { buttonsHeld.remove("interact") }
            }
            #else
            edge("menu", pad.buttonMenu.isPressed) { self.setPaused(!self.paused) }
            edge("inventory", pad.buttonY.isPressed) { self.toggleInventory() }
            edge("torch", pad.buttonX.isPressed) { self.toggleTorch() }
            edge("interact", pad.buttonA.isPressed) { self.interact() }
            edge("back", pad.buttonB.isPressed) { self.handleBack() }
            #endif
        }
        let forward = deadzone(Double(gamepad?.leftThumbstick.yAxis.value ?? 0))
        let strafe = deadzone(Double(gamepad?.leftThumbstick.xAxis.value ?? 0))
        let yaw = -deadzone(Double(gamepad?.rightThumbstick.xAxis.value ?? 0)) * 2.2 * dt
        let pitch = deadzone(Double(gamepad?.rightThumbstick.yAxis.value ?? 0)) * 1.6 * dt
        if !inactive {
            game.move(strafe: strafe + touchMove.x, forward: forward + touchMove.y,
                lookYaw: yaw + pendingLook.x, lookPitch: pitch + pendingLook.y, deltaTime: dt)
        }
        pendingLook = .zero
        rendering.update(position: game.position, yaw: game.yaw, pitch: game.pitch,
            torchOn: game.torchOn, doorsOpen: game.doorsOpen, collected: game.collected)
        uiElapsed += dt
        if uiElapsed >= 0.1 { uiElapsed = 0; refresh() }
        if isUITesting {
            processing.append((CACurrentMediaTime()-frameStart)*1000)
            if processing.count > 600 { processing.removeFirst() }
            metricFrames += 1
            if metricFrames % 30 == 0 { writeMetrics() }
        }
    }

    private func writeMetrics() {
        var info = mach_task_basic_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info_data_t>.size / MemoryLayout<integer_t>.size)
        let result = withUnsafeMutablePointer(to: &info) { pointer in
            pointer.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
            }
        }
        func percentile(_ values: [Double], _ fraction: Double) -> Double {
            let sorted = values.sorted(); return sorted.isEmpty ? 0 : sorted[min(sorted.count-1,Int(Double(sorted.count-1)*fraction))]
        }
        let metrics: [String: Any] = ["scope":"simulator instrumented; CPU update excludes GPU work", "frames":metricFrames,
            "sourceLoadMs":loadingMilliseconds, "displayLinkMedianMs":percentile(intervals,0.5), "displayLinkP95Ms":percentile(intervals,0.95),
            "cpuUpdateP95Ms":percentile(processing,0.95), "residentMB":result == KERN_SUCCESS ? Double(info.resident_size)/1048576 : -1]
        if let data = try? JSONSerialization.data(withJSONObject: metrics, options: [.sortedKeys]),
           let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
            try? data.write(to: directory.appendingPathComponent("native-metrics.json"), options: .atomic)
        }
    }

    private func edge(_ id: String, _ down: Bool, action: () -> Void) {
        if down && !buttonsHeld.contains(id) { action() }
        if down { buttonsHeld.insert(id) } else { buttonsHeld.remove(id) }
    }

    private func deadzone(_ value: Double) -> Double {
        abs(value) < 0.15 ? 0 : (value - (value > 0 ? 0.15 : -0.15)) / 0.85
    }

    func setMove(_ value: SIMD2<Double>) { touchMove = value }
    func addLook(_ delta: CGSize) {
        pendingLook += SIMD2<Double>(-Double(delta.width) * 0.005, -Double(delta.height) * 0.005)
    }
    func interact() {
        guard !inactive, !paused, !inventoryVisible else { return }
        _ = game?.interact()
        refresh()
    }
    func toggleTorch() {
        guard !inactive, !paused, !inventoryVisible else { return }
        game?.toggleTorch()
        refresh()
    }
    func toggleInventory() {
        guard !inactive, !paused else { return }
        game?.toggleInventory()
        rememberHeldButtons()
        touchMove = .zero
        refresh()
    }
    func setPaused(_ value: Bool) {
        game?.setPaused(value)
        rememberHeldButtons()
        touchMove = .zero
        pendingLook = .zero
        refresh()
    }
    func handleBack() {
        guard !inactive else { return }
        game?.handleBack()
        rememberHeldButtons()
        touchMove = .zero
        pendingLook = .zero
        refresh()
    }
    private func rememberHeldButtons() {
        guard let pad = gamepad else { return }
        // A used to activate a native Resume button must not also interact with
        // the world on the first resumed frame. Require a fresh press.
        let states = [("interact", pad.buttonA.isPressed), ("torch", pad.buttonX.isPressed),
                      ("inventory", pad.buttonY.isPressed), ("menu", pad.buttonMenu.isPressed),
                      ("back", pad.buttonB.isPressed)]
        for (id, down) in states {
            if down { buttonsHeld.insert(id) } else { buttonsHeld.remove(id) }
        }
    }
    func sceneActive(_ value: Bool) {
        inactive = !value
        if !value { setPaused(true) }
        previousTime = 0
    }
    func saveCheckpoint() {
        guard let game else { return }
        do {
            if !isUITesting { try saveStore.save(game) }
            checkpointStatus = "Native checkpoint saved. Continue from here next time."
        } catch { checkpointStatus = "Checkpoint could not be saved: \(error.localizedDescription)" }
    }
    func itemName(_ id: String) -> String {
        // The catalogue is shared with Core; identifiers remain available if a future item has no label.
        game?.scene.items.first(where: { $0.id == id })?.name ?? id.replacingOccurrences(of: "_", with: " ")
    }
    private func refresh() {
        guard let game else { return }
        if status != game.status { status = game.status }
        if interaction != game.interactionPrompt { interaction = game.interactionPrompt }
        if inventory != game.inventory { inventory = game.inventory }
        if inventoryVisible != game.inventoryVisible { inventoryVisible = game.inventoryVisible }
        if paused != game.isPaused { paused = game.isPaused }
        if torchOn != game.torchOn { torchOn = game.torchOn }
    }
}
