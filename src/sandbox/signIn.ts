/**
 * Sandbox-only sign-in. EarthBank accepts username and password at
 * `POST /api/authenticate` and returns a JWT. The published module does not call this.
 */
export async function authenticateWithPassword(
  username: string,
  password: string,
  origin: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const name = username.trim();
  if (!name || password === "") throw new Error("Enter a username and password.");

  const base = origin.trim().replace(/\/+$/, "");
  const url = base ? `${base}/api/authenticate` : "/api/authenticate";
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: name, password, rememberMe: false }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(signInFailure(response.status, text, password));
  }
  const jwt = tokenFrom(response, text);
  if (!jwt) throw new Error("Sign-in succeeded but no token was returned.");
  return jwt;
}

function signInFailure(status: number, text: string, password: string): string {
  if (status === 401) return "Username or password was not accepted.";
  const detail = problemDetail(text);
  if (detail && !detail.includes(password)) return detail;
  return `Sign-in failed (${status}).`;
}

function problemDetail(text: string): string | null {
  try {
    const body: unknown = JSON.parse(text);
    if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") {
      const detail = body.detail.trim();
      return detail === "" ? null : detail;
    }
  } catch {
    return null;
  }
  return null;
}

/** Prefer `id_token` in the body. Fall back to `Authorization: Bearer`, which CORS can hide. */
function tokenFrom(response: Response, text: string): string | null {
  try {
    const body: unknown = JSON.parse(text);
    if (body && typeof body === "object" && "id_token" in body && typeof body.id_token === "string") {
      const token = body.id_token.trim();
      if (token) return token;
    }
  } catch {
    // The token may still be on the Authorization header.
  }
  const header = response.headers.get("Authorization");
  if (header && /^Bearer\s+/i.test(header)) {
    const token = header.replace(/^Bearer\s+/i, "").trim();
    if (token) return token;
  }
  return null;
}
