import XCTest

final class NativeSmokeTests: XCTestCase {
    func testNativeSceneLaunches() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--uitesting"]
        app.launch()
        XCTAssertTrue(app.otherElements["native.scene"].waitForExistence(timeout: 30), "Native 3D scene must appear")
        XCTAssertTrue(app.staticTexts["native.status"].exists)
        #if os(iOS)
        XCTAssertTrue(app.buttons["native.inventory"].exists)
        XCTAssertTrue(app.buttons["native.torch"].exists)
        #endif
        let image = XCTAttachment(screenshot: app.screenshot())
        image.name = "Field Signal native \(ProcessInfo.processInfo.operatingSystemVersionString)"
        image.lifetime = .keepAlways
        add(image)
        #if os(iOS)
        app.buttons["native.torch"].tap()
        app.buttons["native.inventory"].tap()
        XCTAssertTrue(app.buttons["native.inventory.close"].waitForExistence(timeout: 5))
        app.buttons["native.inventory.close"].tap()
        app.buttons["native.pause"].tap()
        XCTAssertTrue(app.buttons["native.resume"].waitForExistence(timeout: 5))
        app.buttons["native.resume"].tap()
        #elseif os(tvOS)
        XCUIRemote.shared.press(.menu)
        XCTAssertTrue(app.buttons["native.resume"].waitForExistence(timeout: 5))
        XCUIRemote.shared.press(.menu)
        XCTAssertTrue(app.staticTexts["native.status"].waitForExistence(timeout: 5))
        #endif
    }
}
