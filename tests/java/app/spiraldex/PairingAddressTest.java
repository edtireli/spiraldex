package app.spiraldex;

public final class PairingAddressTest {
 private static int checks;
 private static void equal(String expected, String actual) {
  checks++;
  if (!expected.equals(actual)) throw new AssertionError(expected + " != " + actual);
 }
 private static void rejects(String address) {
  checks++;
  try { PairingAddress.normalize(address); }
  catch (IllegalArgumentException expected) { return; }
  throw new AssertionError("Accepted invalid address: " + address);
 }
 public static void main(String[] args) {
  String gateway = "https://edspiral.duckdns.org:8443/spiraldex";
  String[] bases = {"https://192.168.0.145:8445", "https://edspiral.duckdns.org:8445",
      "https://localhost", "https://[::1]:8445", gateway, "https://example.org/services/spiraldex"};
  String[] paths = {"/api/health", "/api/scan", "/api/scan/status?id=0123456789abcdef0123456789abcdef"};
  for (String base : bases) {
   equal(base, PairingAddress.normalize(base));
   equal(base, PairingAddress.normalize("  " + base + "/  "));
   for (String path : paths) equal(base + path, PairingAddress.endpoint(base + "/", path));
  }
  equal(gateway, PairingAddress.normalize("HTTPS://edspiral.duckdns.org:8443/spiraldex"));
  String[] invalid = {null, "", "edspiral.duckdns.org:8443/spiraldex", "http://example.org",
      "https://", "https://example.org:", "https://example.org:0", "https://example.org:65536",
      "https://example.org:-1", "https://user:password@example.org", "https://user@example.org",
      "https://example.org?token=x", "https://example.org/spiraldex#fragment", "https://example.org?",
      "https://example.org#", "https://example.org//spiraldex", "https://example.org/spiraldex//",
      "https://example.org/./spiraldex", "https://example.org/spiraldex/..", "https://example.org/%2e%2e",
      "https://example.org/spiraldex%2fother", "https://example.org/spiraldex\\other",
      "https://example.org/spiral dex", "https://example.org/spiraldex;other", "https://example.org/spiraldex\nother"};
  for (String value : invalid) rejects(value);
  String[] blockedPaths = {null, "", "https://example.org/api/health", "//example.org/api/health",
      "/../api/health", "/api/health?redirect=1", "/api/scan/status?id=bad", "/api/scan/other"};
  for (String path : blockedPaths) {
   checks++;
   if (PairingAddress.allowsPath(path)) throw new AssertionError("Unexpected API path: " + path);
   try { PairingAddress.endpoint(gateway, path); throw new AssertionError("Escaped API allowlist"); }
   catch (IllegalArgumentException expected) { }
  }
  System.out.println("PASS: " + checks + " pairing address and API routing checks");
 }
}
