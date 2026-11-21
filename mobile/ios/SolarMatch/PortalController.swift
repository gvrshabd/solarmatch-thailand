import UIKit
import WebKit
import EventKit
import EventKitUI
import MessageUI

final class PortalController: UIViewController, WKNavigationDelegate,
                             MFMessageComposeViewControllerDelegate, EKEventEditViewDelegate {
    private let origin: PortalOrigin? = {
        let setting = Bundle.main.object(forInfoDictionaryKey: "InstallerPortalOrigin") as? String ?? ""
        #if DEBUG
        return PortalOrigin(setting: setting, debug: true)
        #else
        return PortalOrigin(setting: setting, debug: false)
        #endif
    }()
    private let web: WKWebView = {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.applicationNameForUserAgent = "SolarMatchInstallers/iOS"
        return WKWebView(frame: .zero, configuration: configuration)
    }()
    private let loading = UIActivityIndicatorView(style: .large)
    private let messageView = UIStackView()
    private let titleLabel = UILabel()
    private let detailLabel = UILabel()
    private let retry = UIButton(type: .system)
    private let language = UIButton(type: .system)
    private var english = false
    private var retryURL: URL?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        web.navigationDelegate = self
        web.allowsBackForwardNavigationGestures = false // Portal Back flushes pending team notes.
        view.addSubview(web)
        web.translatesAutoresizingMaskIntoConstraints = false
        let safe = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: safe.topAnchor), web.bottomAnchor.constraint(equalTo: safe.bottomAnchor),
            web.leadingAnchor.constraint(equalTo: safe.leadingAnchor), web.trailingAnchor.constraint(equalTo: safe.trailingAnchor)
        ])
        loading.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(loading)
        NSLayoutConstraint.activate([loading.centerXAnchor.constraint(equalTo: safe.centerXAnchor),
                                     loading.centerYAnchor.constraint(equalTo: safe.centerYAnchor)])
        for (label, style) in [(titleLabel, UIFont.TextStyle.title2), (detailLabel, .body)] {
            label.font = .preferredFont(forTextStyle: style)
            label.adjustsFontForContentSizeCategory = true
            label.numberOfLines = 0
            label.textAlignment = .center
        }
        titleLabel.accessibilityTraits.insert(.header)
        messageView.axis = .vertical
        messageView.spacing = 12
        for item in [titleLabel, detailLabel, retry, language] { messageView.addArrangedSubview(item) }
        for button in [retry, language] {
            button.titleLabel?.font = .preferredFont(forTextStyle: .headline)
            button.titleLabel?.adjustsFontForContentSizeCategory = true
            button.heightAnchor.constraint(greaterThanOrEqualToConstant: 48).isActive = true
        }
        retry.addTarget(self, action: #selector(start), for: .touchUpInside)
        language.addTarget(self, action: #selector(switchLanguage), for: .touchUpInside)
        let scroll = UIScrollView()
        scroll.addSubview(messageView)
        view.insertSubview(scroll, aboveSubview: web)
        messageContainer = scroll
        scroll.translatesAutoresizingMaskIntoConstraints = false
        messageView.translatesAutoresizingMaskIntoConstraints = false
        let center = messageView.centerYAnchor.constraint(equalTo: scroll.frameLayoutGuide.centerYAnchor)
        center.priority = .defaultLow
        NSLayoutConstraint.activate([
            scroll.leadingAnchor.constraint(equalTo: safe.leadingAnchor), scroll.trailingAnchor.constraint(equalTo: safe.trailingAnchor),
            scroll.topAnchor.constraint(equalTo: safe.topAnchor), scroll.bottomAnchor.constraint(equalTo: safe.bottomAnchor),
            messageView.leadingAnchor.constraint(equalTo: scroll.contentLayoutGuide.leadingAnchor, constant: 24),
            messageView.trailingAnchor.constraint(equalTo: scroll.contentLayoutGuide.trailingAnchor, constant: -24),
            messageView.widthAnchor.constraint(equalTo: scroll.frameLayoutGuide.widthAnchor, constant: -48),
            messageView.topAnchor.constraint(greaterThanOrEqualTo: scroll.contentLayoutGuide.topAnchor, constant: 24),
            messageView.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor, constant: -24), center
        ])
        start()
    }

    private weak var messageContainer: UIScrollView?

    private func copy(_ thai: String, _ en: String) -> String { english ? en : thai }

    @objc private func switchLanguage() { english.toggle(); showMessage() }

    private func showMessage() {
        loading.stopAnimating()
        web.isHidden = true
        messageContainer?.isHidden = false
        titleLabel.text = copy("เปิดแอปผู้ติดตั้งไม่ได้", "Couldn’t open the installer app")
        detailLabel.text = origin == nil
            ? copy("แอปเวอร์ชันนี้ยังไม่ได้เชื่อมต่อพอร์ทัล", "This build has no portal configured.")
            : copy("ตรวจสอบการเชื่อมต่อ แล้วลองเปิดอีกครั้ง", "Check your connection, then try again.")
        retry.isHidden = origin == nil
        retry.setTitle(copy("ลองอีกครั้ง", "Try again"), for: .normal)
        language.setTitle(english ? "ภาษาไทย" : "English", for: .normal)
        UIAccessibility.post(notification: .screenChanged, argument: titleLabel)
    }

    @objc private func start() {
        guard let origin else { showMessage(); return }
        let target = retryURL ?? origin.entry
        var parts = URLComponents(url: target, resolvingAgainstBaseURL: false)
        if english || parts?.queryItems?.contains(where: { $0.name == "lang" }) == true {
            var items = parts?.queryItems?.filter { $0.name != "lang" } ?? []
            items.append(URLQueryItem(name: "lang", value: english ? "en" : "th"))
            parts?.queryItems = items
        }
        messageContainer?.isHidden = true
        web.isHidden = false
        loading.startAnimating()
        web.load(URLRequest(url: parts?.url ?? target, cachePolicy: .reloadIgnoringLocalCacheData))
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigation: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigation.request.url, let origin else { decisionHandler(.cancel); return }
        let top = navigation.targetFrame?.isMainFrame != false
        if !top { decisionHandler(origin.contains(url) ? .allow : .cancel); return }
        if origin.isPortalPage(url) || (navigation.request.httpMethod == "GET" && origin.isAccountCallback(url)) {
            if origin.isPortalPage(url), navigation.request.httpMethod == "GET" { retryURL = url }
            if navigation.targetFrame == nil {
                decisionHandler(.cancel)
                webView.load(navigation.request)
            } else { decisionHandler(.allow) }
            return
        }
        decisionHandler(.cancel)
        let fromPortal = navigation.sourceFrame.isMainFrame && navigation.sourceFrame.request.url.map(origin.isPortalPage) == true
        guard fromPortal, navigation.request.httpMethod == "GET" else { return }
        let tapped = navigation.navigationType == .linkActivated
        if let intent = InstallerIntent(url), tapped {
            handle(intent)
        } else if url.scheme?.lowercased() == "https" || origin.contains(url) {
            // For redirects and links leaving the portal, show the destination host before leaving the app.
            guard let host = url.host, url.user == nil, url.password == nil,
                  host.lowercased() != "line.me" || tapped else { return }
            confirmExternal(url, host: host)
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        guard response.isForMainFrame else { decisionHandler(.allow); return }
        // Check the final document as well, including HTTP redirects.
        guard let origin, let url = response.response.url,
              origin.isPortalPage(url) || origin.isAccountCallback(url),
              response.canShowMIMEType,
              ((response.response as? HTTPURLResponse)?.statusCode ?? 200) < 500 else {
            decisionHandler(.cancel)
            showMessage()
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loading.stopAnimating()
        if let url = webView.url { syncLanguage(url) }
    }

    private func syncLanguage(_ url: URL) {
        guard let lang = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "lang" })?.value else { return }
        english = lang == "en"
    }

    private func loadFailed(_ error: Error) {
        let issue = error as NSError
        guard !(issue.domain == NSURLErrorDomain && issue.code == NSURLErrorCancelled),
              !(issue.domain == "WebKitErrorDomain" && issue.code == 102) else { return }
        if let url = retryURL { syncLanguage(url) }
        showMessage()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { loadFailed(error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { loadFailed(error) }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { showMessage() }

    private func notify(_ message: String) {
        guard presentedViewController == nil else { return }
        let alert = UIAlertController(title: message, message: nil, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: copy("ตกลง", "OK"), style: .default))
        present(alert, animated: true)
    }

    private func confirmExternal(_ url: URL, host: String) {
        if let current = web.url { syncLanguage(current) }
        guard presentedViewController == nil else { return }
        let alert = UIAlertController(title: copy("เปิดลิงก์ภายนอกแอป", "Open link outside the app?"),
                                      message: host, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: copy("ยกเลิก", "Cancel"), style: .cancel))
        alert.addAction(UIAlertAction(title: copy("เปิด", "Open"), style: .default) { _ in
            UIApplication.shared.open(url)
        })
        present(alert, animated: true)
    }

    private func handle(_ intent: InstallerIntent) {
        if let url = web.url { syncLanguage(url) }
        guard presentedViewController == nil else { return }
        switch intent {
        case .call(let url):
            UIApplication.shared.open(url) { [weak self] opened in
                guard !opened, let self else { return }
                self.notify(self.copy("อุปกรณ์นี้โทรออกไม่ได้", "This device can’t make calls."))
            }
        case .text(let phone, let body):
            guard MFMessageComposeViewController.canSendText() else {
                notify(copy("อุปกรณ์นี้ส่ง SMS ไม่ได้", "SMS is unavailable on this device.")); return
            }
            let composer = MFMessageComposeViewController()
            composer.messageComposeDelegate = self
            composer.recipients = [phone]
            composer.body = body
            present(composer, animated: true)
        case .visit(let start):
            let store = EKEventStore()
            let event = EKEvent(eventStore: store)
            event.title = copy("นัดสำรวจหน้างาน SolarMatch", "SolarMatch site visit")
            event.startDate = start
            event.endDate = start.addingTimeInterval(3600)
            let editor = EKEventEditViewController()
            editor.eventStore = store
            editor.event = event
            editor.editViewDelegate = self
            present(editor, animated: true)
        }
    }

    func messageComposeViewController(_ controller: MFMessageComposeViewController, didFinishWith result: MessageComposeResult) {
        controller.dismiss(animated: true)
    }

    func eventEditViewController(_ controller: EKEventEditViewController, didCompleteWith action: EKEventEditViewAction) {
        controller.dismiss(animated: true)
    }
}
