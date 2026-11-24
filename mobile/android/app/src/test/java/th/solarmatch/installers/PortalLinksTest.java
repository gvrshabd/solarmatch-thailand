package th.solarmatch.installers;

import java.net.URI;
import org.junit.Test;
import static org.junit.Assert.*;
import static th.solarmatch.installers.PortalLinks.Action.*;

public class PortalLinksTest {
    private final PortalLinks links = new PortalLinks("https://solar.example");
    @Test public void keepsTheInstallerAndAuthOnTheConfiguredOrigin() {
        assertTrue(links.isPortal(URI.create("https://SOLAR.example:443/installers/app")));
        assertTrue(links.isPortal(URI.create("https://solar.example/api/installer-auth/verify-email?token=synthetic")));
        assertTrue(links.isPortal(URI.create("https://solar.example/installers/payment?orderId=test")));
        assertFalse(links.isPortal(URI.create("http://solar.example/installers")));
        assertFalse(links.isPortal(URI.create("https://solar.example:444/installers")));
        assertFalse(links.isPortal(URI.create("https://other.example/installers")));
        assertFalse(links.isPortal(URI.create("https://solar.example/installers-other")));
        assertFalse(links.isPortal(URI.create("https://user@solar.example/installers")));
        PortalLinks local = new PortalLinks("http://localhost:3000");
        assertFalse(local.isPortal(URI.create("http://localhost:3001/installers")));
        assertTrue(local.isPortal(URI.create("http://localhost:3000/installers/enquiry/fictional")));
    }

    @Test public void systemEditorsRequireAUserGestureFromThePortal() {
        for (String url : new String[]{"tel:+6620000000", "sms:+6620000000?body=Hello",
                "solarmatch-calendar://visit?start=1780000000"}) {
            assertEquals(BLOCK, links.classify(URI.create(url), false, true));
            assertEquals(BLOCK, links.classify(URI.create(url), true, false));
        }
        assertEquals(DIAL, links.classify(URI.create("tel:+6620000000"), true, true));
        URI sms = URI.create("sms:+6620000000?body=Test%20%2B%20%E0%B9%84%E0%B8%97%E0%B8%A2");
        assertEquals(SMS, links.classify(sms, true, true));
        assertEquals("+6620000000", PortalLinks.smsRecipient(sms));
        assertEquals("Test + ไทย", PortalLinks.smsBody(sms));
        assertEquals(BLOCK, links.classify(URI.create("sms:12;3456?body=Hi"), true, true));
        URI visit = URI.create("solarmatch-calendar://visit?start=1780000000");
        assertEquals(CALENDAR, links.classify(visit, true, true));
        assertEquals(Long.valueOf(1780000000000L), PortalLinks.calendarStart(visit));
        assertEquals(BLOCK, links.classify(URI.create("solarmatch-calendar://visit?start=1&phone=1"), true, true));
        assertEquals(BLOCK, links.classify(URI.create("solarmatch-calendar://other?start=1"), true, true));
    }

    @Test public void opensWebLinksOutsideAndDropsUnrecognizedSchemes() {
        assertEquals(BROWSER, links.classify(URI.create("https://line.me/R/share?text=fixture"), true, true));
        assertEquals(BLOCK, links.classify(URI.create("https://line.me/R/share?text=fixture"), false, true));
        assertEquals(BROWSER, links.classify(URI.create("https://solar.example/en"), true, true));
        assertEquals(BLOCK, links.classify(URI.create("file:///tmp/fixture"), true, true));
        assertEquals(BLOCK, links.classify(URI.create("intent://visit/"), true, true));
        assertEquals(BLOCK, links.classify(URI.create("https://other.example/path"), true, false));
        assertEquals(BLOCK, links.classify(URI.create("https://user@other.example/path"), true, true));
    }
}
