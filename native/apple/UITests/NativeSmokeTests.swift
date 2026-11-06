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
        app.buttons["native.interact"].tap()
        let opened = NSPredicate(format: "label BEGINSWITH %@", "Opened ")
        expectation(for: opened, evaluatedWith: app.staticTexts["native.status"])
        waitForExpectations(timeout: 5)
        let doorImage = XCTAttachment(screenshot: app.screenshot())
        doorImage.name = "Cottage door opened through native touch UI"
        doorImage.lifetime = .keepAlways
        add(doorImage)
        app.buttons["native.torch"].tap()
        app.buttons["native.inventory"].tap()
        XCTAssertTrue(app.buttons["native.inventory.close"].waitForExistence(timeout: 5))
        // Exercise a real lifecycle pause above an already open inventory.
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.buttons["native.resume"].waitForExistence(timeout: 10))
        app.buttons["native.resume"].tap()
        XCTAssertTrue(app.buttons["native.inventory.close"].waitForExistence(timeout: 5))
        app.buttons["native.inventory.close"].tap()
        app.buttons["native.pause"].tap()
        XCTAssertTrue(app.buttons["native.resume"].waitForExistence(timeout: 5))
        app.buttons["native.resume"].tap()
        expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: app.buttons["native.resume"])
        waitForExpectations(timeout: 5)
        #elseif os(tvOS)
        XCUIRemote.shared.press(.menu)
        XCTAssertTrue(app.buttons["native.resume"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.state, .runningForeground, "Menu must pause inside the native app, not send it to Home.")
        XCUIRemote.shared.press(.menu)
        expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: app.buttons["native.resume"])
        waitForExpectations(timeout: 5)
        XCTAssertEqual(app.state, .runningForeground)
        XCTAssertTrue(app.staticTexts["native.status"].exists)
        #endif
    }
}
