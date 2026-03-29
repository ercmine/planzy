import { describe, expect, it } from "vitest";
import { MemoryIdeasStore } from "../../../plans/bringYourOwn/memoryStorage.js";
import { createIdeasHandlers } from "../ideasHandler.js";
function createMockResponse() {
    const headers = {};
    return {
        statusCode: 200,
        headers,
        setHeader(name, value) {
            headers[name.toLowerCase()] = Array.isArray(value) ? value.join(",") : String(value);
            return this;
        },
        end(chunk) {
            this.body = chunk ? String(chunk) : "";
            return this;
        }
    };
}
function createRequest(method, path, body, headers) {
    const payload = body === undefined ? "" : JSON.stringify(body);
    let consumed = false;
    return {
        method,
        url: path,
        headers: {
            host: "localhost",
            ...(headers ?? {})
        },
        async *[Symbol.asyncIterator]() {
            if (consumed || payload.length === 0) {
                return;
            }
            consumed = true;
            yield Buffer.from(payload, "utf8");
        }
    };
}
describe("ideasHandler", () => {
    it("creates, lists, and deletes ideas", async () => {
        const store = new MemoryIdeasStore();
        const handlers = createIdeasHandlers({ ideasStore: store });
        const postReq = createRequest("POST", "/sessions/s1/ideas", {
            title: "<b>Great Brunch</b>",
            description: "<script>alert('x')</script>Near downtown",
            websiteLink: "https://example.com/path",
            callLink: "tel:+15551234567"
        }, { "x-user-id": "user-1" });
        const postRes = createMockResponse();
        await handlers.postIdea(postReq, postRes, { sessionId: "s1" });
        expect(postRes.statusCode).toBe(201);
        const created = JSON.parse(postRes.body ?? "{}");
        expect(created.ideaId).toBeTruthy();
        const listReq = createRequest("GET", "/sessions/s1/ideas?limit=10");
        const listRes = createMockResponse();
        await handlers.listIdeas(listReq, listRes, { sessionId: "s1" });
        expect(listRes.statusCode).toBe(200);
        const listed = JSON.parse(listRes.body ?? "{}");
        expect(listed.ideas).toHaveLength(1);
        expect(listed.ideas[0]?.ideaId).toBe(created.ideaId);
        expect(listed.ideas[0]?.title).toBe("Great Brunch");
        expect(listed.ideas[0]?.description).toContain("Near downtown");
        expect(listed.ideas[0]?.description).not.toContain("script");
        expect(listed.ideas[0]?.callLink).toBe("tel:+15551234567");
        const deleteReq = createRequest("DELETE", `/sessions/s1/ideas/${created.ideaId}`, undefined, { "x-user-id": "user-1" });
        const deleteRes = createMockResponse();
        await handlers.deleteIdea(deleteReq, deleteRes, { sessionId: "s1", ideaId: created.ideaId });
        expect(deleteRes.statusCode).toBe(204);
        const listAfterDeleteReq = createRequest("GET", "/sessions/s1/ideas");
        const listAfterDeleteRes = createMockResponse();
        await handlers.listIdeas(listAfterDeleteReq, listAfterDeleteRes, { sessionId: "s1" });
        const afterDelete = JSON.parse(listAfterDeleteRes.body ?? "{}");
        expect(afterDelete.ideas).toHaveLength(0);
    });
});
