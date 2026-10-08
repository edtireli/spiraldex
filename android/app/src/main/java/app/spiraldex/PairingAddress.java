package app.spiraldex;

import java.net.URI;
import java.net.URISyntaxException;

/** HTTPS origin plus an optional gateway prefix. API paths stay inside that prefix. */
final class PairingAddress {
 private PairingAddress() {}

 static String normalize(String value) {
  try {
   URI uri = new URI(value == null ? "" : value.trim());
   String path = uri.getRawPath();
   if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null
       || uri.getRawUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null
       || uri.getPort() == 0 || uri.getPort() > 65535 || uri.getRawAuthority().endsWith(":")) {
    throw new IllegalArgumentException("Use an HTTPS address with a hostname and optional gateway path.");
   }
   // Avoid encoded separators, traversal, and ambiguous paths across different proxies.
   if (path == null || !path.matches("(?:/[A-Za-z0-9._~-]+)*/?")) {
    throw new IllegalArgumentException("Use a plain gateway path, for example /spiraldex.");
   }
   for (String segment : path.split("/")) {
    if (segment.equals(".") || segment.equals("..")) {
     throw new IllegalArgumentException("The gateway path cannot contain . or .. segments.");
    }
   }
   if (path.endsWith("/")) path = path.substring(0, path.length() - 1);
   return "https://" + uri.getRawAuthority() + path;
  } catch (URISyntaxException e) {
   throw new IllegalArgumentException("Use an HTTPS address, for example https://edspiral.duckdns.org:8443/spiraldex.", e);
  }
 }

 static boolean allowsPath(String path) {
  return path != null && (path.equals("/api/health") || path.equals("/api/scan")
      || path.matches("/api/scan/status\\?id=[a-f0-9]{32}"));
 }

 static String endpoint(String address, String path) {
  if (!allowsPath(path)) throw new IllegalArgumentException("Unsupported SpiralDex API path.");
  return normalize(address) + path;
 }
}
