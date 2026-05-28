# Securely REST API Documentation

This outlines the endpoints available for programmatically creating Zero-Knowledge encrypted bins.

## Important Note on Encryption

**Securely is a Zero-Knowledge platform.** 
This means the server NEVER encrypts or decrypts data itself, and handles zero plaintext data or encryption keys.

When you use the REST API, **you** must perform standard AES-GCM 256 encryption on the client side before sending the ciphertext and Initialization Vectors (IVs) to the Securely API.

---

## 1. Create a New Bin

**Endpoint:** `POST /api/v1/bin`
**Rate Limit:** Depends on the API Key quota.

### Request Body (JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `binId` | String | Yes | A unique identifier for the bin (e.g. random 8-character string). |
| `encryptedTextBlob` | String | Yes | Base64 encoded ArrayBuffer of the encrypted text payload. |
| `encryptedFiles` | Array of Objects \| null | No | Array containing `{ filename, mimeType, encryptedBlob, iv }` objects. |
| `ivText` | String | Yes | Base64 encoded 12-byte Initialization Vector used for the text encryption. |
| `isPasswordProtected` | Boolean | Yes | Provide `true` if the key was derived from a user password. |
| `expiresAt` | Date (ISO 8601) | Yes | UTC timestamp specifying when the bin should automatically delete. |

### Example Request (Node.js)

```javascript
const response = await fetch("https://your-domain.com/api/v1/bin", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
    // "Authorization": "Bearer sec_YOUR_API_KEY" // (If API Key enforcement is enabled)
  },
  body: JSON.stringify({
    binId: "rand0mId",
    encryptedTextBlob: "Base64Ciphertext==",
    encryptedFiles: [
      {
         filename: "secret.txt",
         mimeType: "text/plain",
         encryptedBlob: "FileBase64Ciphertext==",
         iv: "FileBase64IV=="
      }
    ],
    ivText: "Base64IV==",
    isPasswordProtected: false,
    expiresAt: "2026-05-27T12:00:00.000Z"
  })
});

const data = await response.json();
console.log(data.binId); // "rand0mId"
```

## 2. Retrieve a Bin

**Endpoint:** `GET /api/v1/bin/:binId`

### Response

Returns `200 OK` with JSON containing the Base64 ciphertext and IVs. Returns `404 Not Found` if the bin does not exist or has expired.

```json
{
  "binId": "rand0mId",
  "encryptedTextBlob": "Base64Ciphertext==",
  "encryptedFileBlob": null,
  "encryptedFiles": [],
  "ivText": "Base64IV==",
  "ivFile": null,
  "isPasswordProtected": false,
  "expiresAt": "2026-05-27T12:00:00.000Z",
  "createdAt": "2026-05-26T12:00:00.000Z"
}
```

## Text Box Capabilities

The `text` field enclosed within your encrypted JSON payload is highly versatile. The client application treats it exactly the same whether it was created via the UI or the API, meaning you can leverage these advanced formats programmatically:

- **Plain Text**: Standard secret text.
- **Markdown (MD)**: Use standard Markdown to format your content (e.g., `**bold**`, `# Headings`, lists, and code blocks).
- **Pure HTML**: If your text starts with `<` and ends with `>`, the viewing application will interpret it as pure HTML. This allows for advanced styling and custom layouts!
- **CSS Styles**: Custom CSS via `<style>` tags is fully supported in HTML mode to let you customize the look of your bin (e.g., background animations, gradients).
- **Videos & Iframes**: You can embed videos using standard HTML5 `<video>` tags or embed external content using `<iframe>` tags within your HTML.

### Payload Examples for Advanced Formatting

When constructing the JSON payload (Step 2 in the guidelines below) before stringifying and encrypting it, format the `text` field as desired:

**1. Markdown Payload**
```json
{
  "text": "# Project Apollo\n**Status:** Classified\n\n- Objective 1\n- Objective 2",
  "theme": "default",
  "salt": null
}
```

**2. Pure HTML Payload (with styles and iframes)**
```json
{
  "text": "<div>\n  <style>.highlight { color: #10b981; font-weight: bold; }</style>\n  <h1 class=\"highlight\">Secure Video Protocol</h1>\n  <iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/dQw4w9WgXcQ\" frameborder=\"0\"></iframe>\n</div>",
  "theme": "default",
  "salt": null
}
```

## Encryption Guidelines (Browser / Web Crypto API)

To properly format the `encryptedTextBlob` payload, you must:

1. Create a `CryptoKey` using `AES-GCM` of length 256.
2. Stringify your data as JSON. (e.g. `{ text: "Top Secret" }`)
3. Convert the JSON string to an ArrayBuffer using `new TextEncoder().encode(text)`.
4. Generate a 12-byte random IV.
5. Encrypt using `crypto.subtle.encrypt({ name: "AES-GCM", iv: randomIv }, key, buffer)`.
6. Convert the resulting ArrayBuffer ciphertext to a Base64 string.
7. Send the Base64 ciphertext and Base64 IV to the server.
8. Append the raw encryption key as a URL `#hash` parameter when sharing the link with others.
