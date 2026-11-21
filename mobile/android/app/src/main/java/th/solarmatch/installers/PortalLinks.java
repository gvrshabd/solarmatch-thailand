package th.solarmatch.installers;

import java.net.URI;
import java.net.URLDecoder;
import java.io.UnsupportedEncodingException;

/** Only installer and authentication pages belong in the first-party WebView. */
final class PortalLinks {
    enum Action { INTERNAL, DIAL, SMS, CALENDAR, BROWSER, BLOCK }

    private final URI origin;
    PortalLinks(String origin) { this.origin = URI.create(origin); }

    boolean isPortal(URI url) {
        String path = url.normalize().getRawPath();
        return isSameOrigin(url) && path != null && (path.equals("/installers") ||
                path.startsWith("/installers/") || path.startsWith("/api/installer-auth/"));
    }

    Action classify(URI url, boolean gesture, boolean trustedSource) {
        if (isPortal(url)) return Action.INTERNAL;
        if (!trustedSource || url.getRawFragment() != null && url.isOpaque()) return Action.BLOCK;
        String scheme = url.getScheme() == null ? "" : url.getScheme();
        if ("tel".equalsIgnoreCase(scheme) && gesture && validPhone(url.getRawSchemeSpecificPart())) {
            return Action.DIAL;
        }
        if ("sms".equalsIgnoreCase(scheme) && gesture && smsRecipient(url) != null) return Action.SMS;
        if ("solarmatch-calendar".equals(scheme) && gesture && calendarStart(url) != null) return Action.CALENDAR;
        // A provider can navigate after an async portal action. The OS handoff
        // always requires confirmation, including for non-gesture HTTPS redirects.
        if ("line.me".equalsIgnoreCase(url.getHost()) && !gesture) return Action.BLOCK;
        if (url.getUserInfo() == null && url.getHost() != null &&
                ("https".equalsIgnoreCase(scheme) || isSameOrigin(url))) return Action.BROWSER;
        return Action.BLOCK;
    }

    private boolean isSameOrigin(URI url) {
        return url.getRawUserInfo() == null && origin.getScheme().equalsIgnoreCase(url.getScheme()) &&
                origin.getHost().equalsIgnoreCase(url.getHost()) && port(origin) == port(url);
    }
    private static int port(URI url) {
        return url.getPort() != -1 ? url.getPort() : "https".equalsIgnoreCase(url.getScheme()) ? 443 : 80;
    }

    private static boolean validPhone(String number) { return number.matches("\\+?[0-9]{3,18}"); }
    static String smsRecipient(URI uri) {
        String[] parts = uri.getRawSchemeSpecificPart().split("[?&]", 2);
        return validPhone(parts[0]) && (parts.length == 1 ||
                (parts[1].startsWith("body=") && !parts[1].contains("&"))) ? parts[0] : null;
    }
    static String smsBody(URI uri) {
        int index = uri.getRawSchemeSpecificPart().indexOf("body=");
        if (index < 0) return "";
        try {
            return URLDecoder.decode(uri.getRawSchemeSpecificPart().substring(index + 5), "UTF-8");
        } catch (UnsupportedEncodingException impossible) { throw new AssertionError(impossible); }
    }
    static Long calendarStart(URI uri) {
        String query = uri.getRawQuery();
        if (!"visit".equals(uri.getRawAuthority()) || !"".equals(uri.getRawPath()) ||
                uri.getRawFragment() != null || query == null || !query.matches("start=[0-9]{1,11}")) return null;
        return Long.parseLong(query.substring(6)) * 1000L;
    }
}
