// Standalone Foundation checks. Run with PortalOrigin.swift as documented in README.md.
import Foundation

func url(_ value: String) -> URL { URL(string: value)! }

let debug = PortalOrigin(setting: "", debug: true)!
precondition(debug.entry.absoluteString == "http://localhost:3000/installers/app")
precondition(PortalOrigin(setting: "", debug: false) == nil)
precondition(PortalOrigin(setting: "http://installer.example.test", debug: true) == nil)
precondition(PortalOrigin(setting: "http://localhost:3000", debug: false) == nil)
precondition(PortalOrigin(setting: "https://localhost", debug: false) == nil)
precondition(PortalOrigin(setting: "https://installer.example.test/path", debug: false) == nil)
precondition(PortalOrigin(setting: "https://user@installer.example.test", debug: false) == nil)

let example = PortalOrigin(setting: "https://installer.example.test", debug: false)!
precondition(example.isPortalPage(url("https://installer.example.test:443/installers/enquiry/fixture")))
for other in ["http://installer.example.test/installers", "https://installer.example.test.evil.test/installers",
              "https://installer.example.test:444/installers/app", "https://installer.example.test/installers-other",
              "https://user@installer.example.test/installers", "https://installer.example.test/admin",
              "https://installer.example.test/installers/%2e%2e/admin", "https://installer.example.test/installers/%2Fadmin"] {
    precondition(!example.isPortalPage(url(other)))
}
precondition(example.isAccountCallback(url("https://installer.example.test/api/installer-auth/verify-email?token=x")))
precondition(example.isAccountCallback(url("https://installer.example.test/api/installer-auth/reset-password/fixture")))
precondition(!example.isAccountCallback(url("https://installer.example.test/api/installer-auth/reset-password")))
precondition(!example.isAccountCallback(url("https://other.example.test/api/installer-auth/verify-email")))
guard case let .text(phone, body)? = InstallerIntent(url("sms:+66000000000?body=Hello%20%26%20%E0%B9%84%E0%B8%97%E0%B8%A2")) else {
    fatalError("Expected an editable SMS")
}
precondition(phone == "+66000000000" && body == "Hello & ไทย")
guard case let .visit(start)? = InstallerIntent(url("solarmatch-calendar://visit?start=1800000000")) else {
    fatalError("Expected a calendar date")
}
precondition(start.timeIntervalSince1970 == 1_800_000_000)
for invalid in ["sms:10000?body=one&body=two", "tel:10000%23", "tel:10000?body=hello",
                "sms://untrusted.test/10000", "solarmatch-calendar://visit?start=100&name=private",
                "solarmatch-calendar://visit?start=-1", "file:///tmp/example", "javascript:alert(1)"] {
    precondition(InstallerIntent(url(invalid)) == nil)
}
print("Passed iOS installer origin, portal path, auth callback, SMS and calendar cases.")
