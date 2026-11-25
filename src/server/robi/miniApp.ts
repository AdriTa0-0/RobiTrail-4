// Tiny Express-like router so the original RobiTrail API handlers run on Web Requests.
export interface Request {
  body: Record<string, unknown>;
  rawBody?: string;
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string | undefined>;
  [key: string]: unknown;
}
export interface Response {
  status(code: number): Response;
  json(data: unknown): void;
}
export type NextFunction = () => void;
type Handler = (req: Request, res: Response, next: NextFunction) => unknown;

interface RouteDef {
  method: string;
  pattern: RegExp;
  keys: string[];
  handlers: Handler[];
}

export function createMiniApp() {
  const routes: RouteDef[] = [];
  const add =
    (method: string) =>
    (path: string, ...handlers: Handler[]) => {
      const keys: string[] = [];
      const pattern = new RegExp(
        "^" +
          path.replace(/:([a-zA-Z]+)/g, (_m, k: string) => {
            keys.push(k);
            return "([^/]+)";
          }) +
          "$",
      );
      routes.push({ method, pattern, keys, handlers });
    };
  return {
    get: add("GET"),
    post: add("POST"),
    put: add("PUT"),
    patch: add("PATCH"),
    delete: add("DELETE"),
    use: (..._args: unknown[]) => {},
    async handle(request: Request | globalThis.Request): Promise<globalThis.Response> {
      const r = request as globalThis.Request;
      const url = new URL(r.url);
      for (const route of routes) {
        if (route.method !== r.method) continue;
        const m = url.pathname.match(route.pattern);
        if (!m) continue;
        const params: Record<string, string> = {};
        route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1] ?? "")));
        let rawBody: unknown = {};
        let rawText = "";
        if (r.method !== "GET") {
          try {
            rawText = await r.text();
            rawBody = rawText ? JSON.parse(rawText) : {};
          } catch {
            rawBody = {};
          }
        }
        const body =
          rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)
            ? (rawBody as Record<string, unknown>)
            : {};
        const query: Record<string, string> = {};
        url.searchParams.forEach((v, k) => {
          query[k] = v;
        });
        const headers: Record<string, string> = {};
        r.headers.forEach((v, k) => (headers[k] = v));
        const req: Request = { body, rawBody: rawText, params, query, headers };
        let statusCode = 200;
        let payload: unknown = null;
        let done = false;
        const res: Response = {
          status(code) {
            statusCode = code;
            return res;
          },
          json(data) {
            payload = data;
            done = true;
          },
        };
        for (const h of route.handlers) {
          let advanced = false;
          await h(req, res, () => {
            advanced = true;
          });
          if (done || !advanced) break;
        }
        return new globalThis.Response(JSON.stringify(payload), {
          status: statusCode,
          headers: { "content-type": "application/json" },
        });
      }
      return new globalThis.Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    },
  };
}
