package th.solarmatch.installers;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.CalendarContract;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import android.window.OnBackInvokedDispatcher;
import java.net.URI;

public final class InstallerActivity extends Activity {
    private PortalLinks links;
    private WebView web;
    private FrameLayout root;
    private ScrollView errorView;
    private boolean english;
    /** The last installer page shown, so a restarted renderer reopens the same enquiry. */
    private String lastPortalUrl;
    /** android.window.OnBackInvokedCallback on Android 13+; typed as Object so older versions never load it. */
    private Object backCallback;
    private boolean backRegistered;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        // When the task was first opened another way (Play's or the installer's "Open" button), the
        // launcher icon would stack a second, empty copy over the open enquiry. Show the existing one.
        Intent launch = getIntent();
        if (!isTaskRoot() && launch != null && Intent.ACTION_MAIN.equals(launch.getAction()) &&
                launch.hasCategory(Intent.CATEGORY_LAUNCHER)) {
            finish();
            return;
        }
        english =getPreferences(MODE_PRIVATE).getBoolean("english", false);
        links = new PortalLinks(BuildConfig.PORTAL_ORIGIN);
        root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.stone));
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets edges = insets.getInsets(WindowInsets.Type.systemBars() |
                        WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(edges.left, edges.top, edges.right, edges.bottom);
                return WindowInsets.CONSUMED;
            });
        }
        setContentView(root);
        web = new WebView(this);
        root.addView(web);
        configureWebView();
        // Android may end the app while the dialer, Messages or Calendar is in front. Reopen the
        // same enquiry and its history instead of starting again at the inbox. The page restores
        // its own "How did the call go?" step; notes are saved before the app leaves the screen.
        if (state == null || !restorePortal(state)) openInstaller();
        updateBack();
    }

    private boolean restorePortal(Bundle state) {
        if (web.restoreState(state) == null) return false;
        lastPortalUrl = state.getString("portalUrl");
        URI page = parse(web.getUrl());
        if (page != null && links.isPortal(page)) return true;
        URI saved = parse(lastPortalUrl);
        if (saved == null || !links.isPortal(saved)) return false;
        web.loadUrl(lastPortalUrl);
        return true;
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        if (errorView == null) web.saveState(state);
        if (lastPortalUrl != null) state.putString("portalUrl", lastPortalUrl);
    }

    @Override protected void onPause() {
        super.onPause();
        // Persist the secure session cookie before the system can stop the process.
        CookieManager.getInstance().flush();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setGeolocationEnabled(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(Math.round(getResources().getConfiguration().fontScale * 100));
        settings.setUserAgentString(settings.getUserAgentString() + " SolarMatchInstallers/Android");
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                URI target = parse(request.getUrl().toString());
                if (target == null) return true;
                URI current = parse(view.getUrl());
                PortalLinks.Action action = links.classify(target, request.hasGesture(), current != null && links.isPortal(current));
                if (action == PortalLinks.Action.INTERNAL) return false;
                if (!"GET".equalsIgnoreCase(request.getMethod())) return true;
                switch (action) {
                    case DIAL:
                        handOff(new Intent(Intent.ACTION_DIAL, request.getUrl()));
                        break;
                    case SMS:
                        Intent sms = new Intent(Intent.ACTION_SENDTO, Uri.fromParts("smsto", PortalLinks.smsRecipient(target), null));
                        sms.putExtra("sms_body", PortalLinks.smsBody(target));
                        handOff(sms);
                        break;
                    case CALENDAR:
                        long start = PortalLinks.calendarStart(target);
                        Intent calendar = new Intent(Intent.ACTION_INSERT, CalendarContract.Events.CONTENT_URI);
                        calendar.putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, start);
                        calendar.putExtra(CalendarContract.EXTRA_EVENT_END_TIME, start + 60 * 60 * 1000);
                        calendar.putExtra(CalendarContract.Events.TITLE, label("สำรวจหน้างาน SolarMatch", "SolarMatch site visit"));
                        handOff(calendar);
                        break;
                    case BROWSER:
                        new AlertDialog.Builder(InstallerActivity.this)
                                .setTitle(label("เปิดลิงก์ภายนอก", "Open external link"))
                                .setMessage(target.getHost())
                                .setNegativeButton(label("ยกเลิก", "Cancel"), null)
                                .setPositiveButton(label("เปิด", "Open"), (dialog, which) ->
                                        handOff(new Intent(Intent.ACTION_VIEW, request.getUrl()).addCategory(Intent.CATEGORY_BROWSABLE)))
                                .show();
                        break;
                    default:
                        break;
                }
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                // WebView does not call shouldOverrideUrlLoading for POST navigations.
                // Keep top-level form navigations inside the same installer boundary.
                if (request.isForMainFrame()) {
                    URI target = parse(request.getUrl().toString());
                    if (target == null || !links.isPortal(target)) {
                        return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", null, null);
                    }
                }
                return null;
            }
            @Override public void doUpdateVisitedHistory(WebView view, String url, boolean reload) {
                URI page = parse(url);
                if (page != null && links.isPortal(page)) {
                    lastPortalUrl = url;
                    String lang = Uri.parse(url).getQueryParameter("lang");
                    if ("th".equals(lang) || "en".equals(lang)) rememberLanguage("en".equals(lang));
                }
                updateBack();
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // Under memory pressure the system may stop the page while another app is in front.
                // Replace the WebView and reopen the last installer page rather than closing the app.
                if (view != web) return false;
                root.removeView(web);
                web.destroy();
                web = new WebView(InstallerActivity.this);
                root.addView(web, 0);
                configureWebView();
                URI saved = parse(lastPortalUrl);
                if (saved != null && links.isPortal(saved)) web.loadUrl(lastPortalUrl);
                else openInstaller();
                updateBack();
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showError();
            }
        });
    }

    private static URI parse(String value) {
        if (value == null) return null;
        try { return URI.create(value); } catch (IllegalArgumentException invalid) { return null; }
    }

    private void handOff(Intent intent) {
        try { startActivity(intent); }
        catch (ActivityNotFoundException e) {
            Toast.makeText(this, label("ไม่พบแอปที่เปิดรายการนี้ได้", "No app is available for this action."), Toast.LENGTH_LONG).show();
        }
    }
    private String label(String thai, String en) { return english ? en : thai; }
    private void rememberLanguage(boolean useEnglish) {
        if (useEnglish != english) {
            english = useEnglish;
            getPreferences(MODE_PRIVATE).edit().putBoolean("english", english).apply();
        }
    }
    private void openInstaller() {
        if (errorView != null) {
            root.removeView(errorView);
            errorView = null;
        }
        web.setVisibility(View.VISIBLE);
        // Retry is a fresh read. Never resubmit a payment, note or other mutation.
        web.loadUrl(BuildConfig.PORTAL_ORIGIN + "/installers/app" + (english ? "?lang=en" : ""));
        updateBack();
    }

    private void showError() {
        if (errorView != null) root.removeView(errorView);
        web.setVisibility(View.GONE);
        errorView = new ScrollView(this);
        errorView.setFillViewport(true);
        errorView.setBackgroundColor(getColor(R.color.stone));
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER_VERTICAL);
        panel.setPadding(dp(28), dp(28), dp(28), dp(28));
        TextView title = new TextView(this);
        title.setText(label("เปิดแอปผู้ติดตั้งไม่ได้", "Can’t open the installer app"));
        title.setTextSize(26);
        title.setTextColor(Color.rgb(20, 45, 38));
        if (Build.VERSION.SDK_INT >= 28) title.setAccessibilityHeading(true);
        panel.addView(title);
        TextView note = new TextView(this);
        note.setText(label("ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง", "Check your connection, then try again."));
        note.setTextSize(18);
        note.setPadding(0, dp(12), 0, dp(24));
        panel.addView(note);
        Button retry = new Button(this);
        retry.setText(label("ลองอีกครั้ง", "Try again"));
        retry.setAllCaps(false);
        retry.setMinHeight(dp(52));
        retry.setOnClickListener(v -> openInstaller());
        panel.addView(retry);
        Button language = new Button(this);
        language.setText(label("English", "ภาษาไทย"));
        language.setAllCaps(false);
        language.setMinHeight(dp(48));
        language.setOnClickListener(v -> { rememberLanguage(!english); showError(); });
        panel.addView(language);
        errorView.addView(panel);
        root.addView(errorView);
        title.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        updateBack();
    }
    private int dp(int value) { return Math.round(getResources().getDisplayMetrics().density * value); }

    private boolean canGoBackInPortal() { return errorView == null && web != null && web.canGoBack(); }

    /**
     * Back walks the installer history. From the first page it leaves to the home screen the way
     * Android 12+ does for any app: the task stays alive, so reopening is instant. On Android 13+
     * the callback is registered only while there is history, so the system's predictive back
     * animation shows when Back will leave the app.
     */
    private void updateBack() {
        if (Build.VERSION.SDK_INT < 33) return;
        boolean wanted = canGoBackInPortal();
        if (wanted == backRegistered) return;
        if (backCallback == null) backCallback = (android.window.OnBackInvokedCallback) this::goBackInPortal;
        android.window.OnBackInvokedCallback callback = (android.window.OnBackInvokedCallback) backCallback;
        if (wanted) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, callback);
        else getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(callback);
        backRegistered = wanted;
    }
    private void goBackInPortal() {
        if (canGoBackInPortal()) web.goBack();
        updateBack();
    }
    // Reached only before Android 13. From 13 the manifest opts in to OnBackInvokedCallback (updateBack).
    @SuppressLint("GestureBackNavigation")
    @Override public void onBackPressed() {
        if (canGoBackInPortal()) web.goBack();
        else moveTaskToBack(true);
    }
    @Override protected void onDestroy() {
        if (web != null) {
            root.removeView(web);
            web.destroy();
        }
        super.onDestroy();
    }
}
