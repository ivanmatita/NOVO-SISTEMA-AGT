/**
 * Client JWS Service proxies the request to the secure backend to sign payloads.
 * This guarantees the RS256 private key is NEVER exposed to the client/browser.
 */
export async function signPayload(payload: any): Promise<string> {
  try {
    const response = await fetch("/api/agt/sign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ payload })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.token) {
      throw new Error(data.error || "Failed to generate signature");
    }

    return data.token;
  } catch (error: any) {
    console.error("[CLIENT-JWS-SERVICE] Error requesting payload signature:", error);
    throw new Error(`Erro de assinatura JWS: ${error.message}`);
  }
}
