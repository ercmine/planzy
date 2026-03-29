import { describe, expect, it } from "vitest";
import { defaultAffiliateConfig } from "../config.js";
import { appendParams, wrapPlanLinks, wrapUrl } from "../wrap.js";
describe("affiliate wrapping", () => {
    const basePlan = {
        id: "events:123",
        source: "events",
        sourceId: "123",
        title: "Show",
        category: "music",
        location: { lat: 37.77, lng: -122.42 },
        deepLinks: {
            mapsLink: "https://maps.example.com/p/123",
            websiteLink: "https://event.example.com/page",
            callLink: "tel:+15555550123",
            bookingLink: "https://tickets.example.com/buy?existing=1",
            ticketLink: "https://ticketmaster.com/e/123"
        }
    };
    it("append_params wraps bookingLink and preserves existing query with stable ordering", () => {
        const cfg = {
            ...defaultAffiliateConfig(),
            enabled: true,
            defaultParams: {
                utm_medium: "app",
                utm_source: "planzy"
            }
        };
        const wrapped = wrapPlanLinks(basePlan, cfg, { sessionId: "session-1" });
        const booking = new URL(wrapped.deepLinks?.bookingLink ?? "");
        expect(Array.from(booking.searchParams.keys())).toEqual(["existing", "lt", "pid", "sid", "utm_medium", "utm_source"]);
        expect(booking.searchParams.get("existing")).toBe("1");
        expect(booking.searchParams.get("lt")).toBe("booking");
        expect(booking.searchParams.get("sid")).toHaveLength(12);
        expect(booking.searchParams.get("pid")).toHaveLength(12);
        expect(booking.searchParams.get("utm_source")).toBe("planzy");
        expect(booking.searchParams.get("utm_medium")).toBe("app");
    });
    it("redirect mode wraps ticketLink with redirect target", () => {
        const cfg = {
            ...defaultAffiliateConfig(),
            enabled: true,
            mode: "redirect",
            redirectBaseUrl: "https://ourplanplan.com/r?ignore=1#hash",
            defaultParams: {
                utm_source: "planzy"
            }
        };
        const wrapped = wrapPlanLinks(basePlan, cfg, { sessionId: "session-2" });
        const ticket = new URL(wrapped.deepLinks?.ticketLink ?? "");
        expect(ticket.origin + ticket.pathname).toBe("https://ourplanplan.com/r");
        expect(ticket.searchParams.get("u")).toBe("https://ticketmaster.com/e/123");
        expect(ticket.searchParams.get("lt")).toBe("ticket");
        expect(ticket.searchParams.get("utm_source")).toBe("planzy");
    });
    it("domain rules override defaults", () => {
        const cfg = {
            ...defaultAffiliateConfig(),
            enabled: true,
            defaultParams: { utm_source: "planzy", utm_campaign: "default" },
            domainRules: [{ matchDomain: "ticketmaster.com", params: { utm_campaign: "tm" } }]
        };
        const wrappedTicket = wrapUrl("https://ticketmaster.com/e/456", cfg, { planId: "p", sessionId: "s", linkType: "ticket" });
        const wrappedBooking = wrapUrl("https://tickets.example.com/buy", cfg, { planId: "p", sessionId: "s", linkType: "booking" });
        expect(new URL(wrappedTicket).searchParams.get("utm_campaign")).toBe("tm");
        expect(new URL(wrappedBooking).searchParams.get("utm_campaign")).toBe("default");
    });
    it("keeps unsafe targets unchanged and ignores invalid redirect base", () => {
        const cfg = {
            ...defaultAffiliateConfig(),
            enabled: true,
            mode: "redirect",
            redirectBaseUrl: "javascript:alert(1)",
            defaultParams: { utm_source: "planzy" }
        };
        expect(wrapUrl("javascript:alert(1)", cfg, { linkType: "booking" })).toBe("javascript:alert(1)");
        expect(wrapUrl("https://safe.example.com/path", cfg, { linkType: "booking" })).toBe("https://safe.example.com/path");
    });
    it("wrapPlanLinks only wraps enabled link types", () => {
        const cfg = {
            ...defaultAffiliateConfig(),
            enabled: true,
            wrapBooking: false,
            wrapTicket: true,
            wrapWebsite: false,
            includeSession: false,
            includePlan: false,
            defaultParams: { utm_source: "planzy" }
        };
        const wrapped = wrapPlanLinks(basePlan, cfg, { sessionId: "session-3" });
        expect(wrapped.deepLinks?.bookingLink).toBe(basePlan.deepLinks?.bookingLink);
        expect(new URL(wrapped.deepLinks?.ticketLink ?? "").searchParams.get("utm_source")).toBe("planzy");
        expect(wrapped.deepLinks?.websiteLink).toBe(basePlan.deepLinks?.websiteLink);
    });
    it("appendParams overwrites duplicated keys", () => {
        const wrapped = appendParams("https://example.com/path?utm_source=old&a=1", { utm_source: "new", b: "2" });
        expect(wrapped).toBe("https://example.com/path?a=1&b=2&utm_source=new");
    });
});
