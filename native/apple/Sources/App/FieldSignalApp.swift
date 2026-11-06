import SwiftUI
import SceneKit

@main
struct FieldSignalApp: App {
    @StateObject private var model = NativeGameController()
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            FieldSignalView(model: model)
                .onChange(of: phase) { _, value in model.sceneActive(value == .active) }
        }
    }
}

private struct NativeSceneView: UIViewRepresentable {
    let scene: NativeScene
    func makeUIView(context: Context) -> SCNView {
        // SceneKit selects Metal on the supported iPadOS/tvOS 26 platforms.
        let view = SCNView(frame: .zero)
        view.scene = scene.scene
        view.pointOfView = scene.camera
        view.isPlaying = true
        view.rendersContinuously = true
        view.preferredFramesPerSecond = 60
        view.antialiasingMode = .multisampling2X
        view.backgroundColor = .black
        view.accessibilityIdentifier = "native.scene"
        view.isAccessibilityElement = true
        view.accessibilityLabel = "Field Signal native 3D environment"
        return view
    }
    func updateUIView(_ view: SCNView, context: Context) {}
}

struct FieldSignalView: View {
    @ObservedObject var model: NativeGameController
    @State private var lastLook = CGSize.zero
    #if os(tvOS)
    private enum TVFocus: Hashable { case exploration, resume, inventory }
    @FocusState private var tvFocus: TVFocus?
    #endif
    private let accent = Color(red: 0.82, green: 0.88, blue: 0.65)

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            if let error = model.loadingError {
                VStack(spacing: 20) {
                    Text("Scene unavailable").font(.title)
                    Text(error).accessibilityIdentifier("native.error")
                }.padding(40)
            } else if let scene = model.rendering {
                NativeSceneView(scene: scene).ignoresSafeArea()
                    #if os(tvOS)
                    // Exit commands require an active focus context on TV.
                    // This viewport has no Select action; Core owns gameplay A.
                    .focusable(!model.paused && !model.inventoryVisible)
                    .focused($tvFocus, equals: .exploration)
                    #endif
                #if os(iOS)
                HStack(spacing: 0) {
                    Color.clear
                    Color.clear.contentShape(Rectangle())
                        .gesture(DragGesture(minimumDistance: 0).onChanged { value in
                            let delta = CGSize(width: value.translation.width - lastLook.width,
                                               height: value.translation.height - lastLook.height)
                            model.addLook(delta)
                            lastLook = value.translation
                        }.onEnded { _ in lastLook = .zero })
                }.ignoresSafeArea()
                #endif
                VStack(spacing: 0) {
                    header
                    Spacer()
                    Text("+").font(.system(size: 24, weight: .ultraLight)).foregroundStyle(.white.opacity(0.7))
                        .accessibilityHidden(true)
                    Spacer()
                    footer
                }.padding(hudPadding)
                    .allowsHitTesting(!model.inventoryVisible && !model.paused)
                    .accessibilityHidden(model.inventoryVisible || model.paused)
                if model.inventoryVisible { inventoryPanel }
                if model.paused { pausePanel }
            }
        }
        .foregroundStyle(accent)
        .preferredColorScheme(.dark)
        #if os(tvOS)
        .onAppear { tvFocus = .exploration }
        .onChange(of: model.paused) { _, paused in
            tvFocus = paused ? .resume : (model.inventoryVisible ? .inventory : .exploration)
        }
        .onChange(of: model.inventoryVisible) { _, inventoryVisible in
            tvFocus = model.paused ? .resume : (inventoryVisible ? .inventory : .exploration)
        }
        .onExitCommand { model.handleBack() }
        #endif
    }

    private var hudPadding: CGFloat {
        #if os(tvOS)
        return 54
        #else
        return 22
        #endif
    }
    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 6) {
                Text("FIELD SIGNAL").font(.system(.title2, design: .monospaced).weight(.bold)).tracking(3)
                Text("FORESTER’S COTTAGE · NATIVE EXPERIMENT").font(.caption.monospaced())
                Text(model.controllerName).font(.caption).foregroundStyle(.white.opacity(0.72))
            }
            Spacer()
            #if os(tvOS)
            Text("Menu · pause").font(.callout.monospaced())
            #else
            Button { model.setPaused(true) } label: { Image(systemName: "pause.fill").padding(12) }
                .accessibilityLabel("Pause").accessibilityIdentifier("native.pause")
            #endif
        }.padding(14).background(.black.opacity(0.58), in: RoundedRectangle(cornerRadius: 10))
    }
    private var footer: some View {
        VStack(spacing: 12) {
            Text(model.status).font(.callout).multilineTextAlignment(.center)
                .accessibilityIdentifier("native.status")
                .padding(10).background(.black.opacity(0.7), in: RoundedRectangle(cornerRadius: 8))
            HStack(alignment: .bottom, spacing: 20) {
                #if os(iOS)
                MovementPad(onMove: model.setMove)
                #else
                Text("Left stick · move\nRight stick · look\nA · interact   X · torch\nY · inventory   Menu · pause")
                    .font(.callout.monospaced()).padding(16).background(.black.opacity(0.7), in: RoundedRectangle(cornerRadius: 8))
                #endif
                Spacer(minLength: 0)
                #if os(tvOS)
                Text(model.interaction).font(.title3.monospaced()).padding(18)
                    .background(.black.opacity(0.72), in: RoundedRectangle(cornerRadius: 10))
                #else
                VStack(spacing: 12) {
                    Button(model.interaction) { model.interact() }
                        .accessibilityIdentifier("native.interact")
                    HStack(spacing: 12) {
                        Button(model.torchOn ? "Torch on" : "Torch off") { model.toggleTorch() }
                            .accessibilityIdentifier("native.torch")
                        Button("Inventory") { model.toggleInventory() }
                            .accessibilityIdentifier("native.inventory")
                    }
                }.buttonStyle(.borderedProminent).tint(Color(red: 0.25, green: 0.31, blue: 0.21))
                #endif
            }
            #if os(iOS)
            Text("Drag the left pad to move · drag the right half to look · search then interact again to collect")
                .font(.caption).foregroundStyle(.white.opacity(0.8))
            #endif
        }
    }
    private var inventoryPanel: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("FIELD INVENTORY").font(.title2.monospaced().bold())
            if model.inventory.isEmpty {
                Text("Your pack is empty. Search a container, then interact again to collect its contents.")
            } else {
                ForEach(model.inventory.keys.sorted(), id: \.self) { id in
                    HStack {
                        Text(model.itemName(id))
                        Spacer()
                        Text("×\(model.inventory[id] ?? 0)").monospacedDigit()
                    }
                }
            }
            Button("Return to exploration") { model.toggleInventory() }
                .accessibilityIdentifier("native.inventory.close")
                #if os(tvOS)
                .focused($tvFocus, equals: .inventory)
                #endif
        }
        .padding(32).frame(maxWidth: 600)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
        .padding(30)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.black.opacity(0.65))
    }
    private var pausePanel: some View {
        VStack(spacing: 24) {
            Text("EXPLORATION PAUSED").font(.title2.monospaced().bold())
            Text("Open the cottage door, find supplies and climb the stairs. A controller can be connected at any time.")
                .multilineTextAlignment(.center)
            Text("This experimental native session is separate from browser campaigns.")
                .font(.callout).foregroundStyle(.secondary)
            Text(model.checkpointStatus).font(.callout).multilineTextAlignment(.center)
            Button("Save native checkpoint") { model.saveCheckpoint() }
                .accessibilityIdentifier("native.save")
            Button("Resume exploration") { model.setPaused(false) }
                .accessibilityIdentifier("native.resume")
                #if os(tvOS)
                .focused($tvFocus, equals: .resume)
                #endif
        }
        .padding(36).frame(maxWidth: 650)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16)).padding(30)
        .frame(maxWidth: .infinity, maxHeight: .infinity).background(.black.opacity(0.75))
    }
}

#if os(iOS)
private struct MovementPad: View {
    let onMove: (SIMD2<Double>) -> Void
    @State private var offset = CGSize.zero
    var body: some View {
        ZStack {
            Circle().fill(.black.opacity(0.45)).overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 1))
            Image(systemName: "arrow.up.and.down.and.arrow.left.and.right").foregroundStyle(.white.opacity(0.3))
            Circle().fill(.white.opacity(0.55)).frame(width: 48, height: 48).offset(offset)
        }
        .frame(width: 140, height: 140)
        .contentShape(Circle())
        .gesture(DragGesture(minimumDistance: 0).onChanged { value in
            let length = hypot(value.translation.width, value.translation.height)
            let scale = length > 48 ? 48 / length : 1
            offset = CGSize(width: value.translation.width * scale, height: value.translation.height * scale)
            onMove(SIMD2<Double>(Double(offset.width / 48), -Double(offset.height / 48)))
        }.onEnded { _ in offset = .zero; onMove(.zero) })
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Movement pad").accessibilityIdentifier("native.move")
    }
}
#endif
