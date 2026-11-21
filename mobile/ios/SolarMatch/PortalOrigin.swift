import Foundation

/// The website authenticates the WebView directly with its normal first-party cookies.
struct PortalOrigin {
    let root: URL
    var entry: URL { root.appendingPathComponent("installers/app") }

    init?(setting: String, debug: Bool) {
        let value = setting.trimmingCharacters(in: .whitespacesAndNewlines)
        let raw = value.isEmpty && debug ? "http://localhost:3000" : value
        guard let parts = URLComponents(string: raw), let url = parts.url,
              let host = parts.host?.lowercased(), !host.isEmpty,
              parts.user == nil, parts.password == nil, parts.query == nil, parts.fragment == nil,
              parts.path.isEmpty || parts.path == "/" else { return nil }
        let loopback = ["localhost", "127.0.0.1", "::1", "[::1]"].contains(host)
        let scheme = parts.scheme?.lowercased()
        guard (scheme == "https" && (debug || !loopback)) || (debug && loopback && scheme == "http") else { return nil }
        root = url
    }

    func contains(_ url: URL) -> Bool {
        guard url.user == nil, url.password == nil, url.scheme?.lowercased() == root.scheme?.lowercased(),
              url.host?.lowercased() == root.host?.lowercased() else { return false }
        let defaultPort = root.scheme?.lowercased() == "https" ? 443 : 80
        return (url.port ?? defaultPort) == (root.port ?? defaultPort)
    }

    func isPortalPage(_ url: URL) -> Bool {
        guard contains(url), let encodedPath = URLComponents(url: url, resolvingAgainstBaseURL: false)?.percentEncodedPath.lowercased(),
              !encodedPath.contains("%2f"), !encodedPath.contains("%5c"),
              !url.path.split(separator: "/").contains(where: { $0 == "." || $0 == ".." }) else { return false }
        return url.path == "/installers" || url.path.hasPrefix("/installers/")
    }

    func isAccountCallback(_ url: URL) -> Bool {
        guard contains(url) else { return false }
        return url.path == "/api/installer-auth/verify-email" ||
            url.path.range(of: #"^/api/installer-auth/reset-password/[^/]+$"#, options: .regularExpression) != nil
    }
}

/// Only hand off to an OS editor after a tap from a first-party installer document.
enum InstallerIntent {
    case call(URL), text(String, String), visit(Date)

    init?(_ url: URL) {
        guard let parts = URLComponents(url: url, resolvingAgainstBaseURL: false),
              parts.user == nil, parts.password == nil, parts.fragment == nil else { return nil }
        let items = parts.queryItems ?? []
        switch parts.scheme?.lowercased() {
        case "tel", "sms":
            guard parts.host == nil, parts.path.range(of: #"^\+?[0-9][0-9 -]{3,23}$"#, options: .regularExpression) != nil else { return nil }
            if parts.scheme?.lowercased() == "tel" {
                guard items.isEmpty else { return nil }
                self = .call(url)
            } else {
                guard items.count <= 1, items.allSatisfy({ $0.name == "body" }) else { return nil }
                self = .text(parts.path, items.first?.value ?? "")
            }
        case "solarmatch-calendar":
            guard parts.host == "visit", parts.port == nil, parts.path.isEmpty, items.count == 1,
                  items[0].name == "start", let raw = items[0].value, raw.count <= 10,
                  let seconds = Int64(raw), (0...4_102_444_800).contains(seconds) else { return nil }
            self = .visit(Date(timeIntervalSince1970: TimeInterval(seconds)))
        default:
            return nil
        }
    }
}
