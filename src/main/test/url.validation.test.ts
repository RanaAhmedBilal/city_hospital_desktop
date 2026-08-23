import { describe, it, expect } from 'vitest';

function isAllowedExternalUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    const allowedDomains = [
      'localhost',
      '127.0.0.1',
      'cityhospital.org',
      'cityhospital.com',
    ];

    return allowedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

describe('Strict URL Scheme & Domain Whitelist Validation', () => {
  it('should allow valid HTTPS links from whitelisted domains', () => {
    expect(isAllowedExternalUrl('https://cityhospital.org/portal')).toBe(true);
    expect(isAllowedExternalUrl('https://sub.cityhospital.com/help')).toBe(true);
    expect(isAllowedExternalUrl('http://localhost:5173')).toBe(true);
    expect(isAllowedExternalUrl('http://127.0.0.1:8080')).toBe(true);
  });

  it('should block untrusted external domains', () => {
    expect(isAllowedExternalUrl('https://malicious-phishing-site.com')).toBe(false);
    expect(isAllowedExternalUrl('https://evil-hacker.net/login')).toBe(false);
  });

  it('should block dangerous non-HTTP schemes', () => {
    expect(isAllowedExternalUrl('file:///C:/Windows/System32/cmd.exe')).toBe(false);
    expect(isAllowedExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isAllowedExternalUrl('vbscript:msgbox')).toBe(false);
  });

  it('should handle invalid or malformed URL strings gracefully', () => {
    expect(isAllowedExternalUrl('not-a-valid-url')).toBe(false);
    expect(isAllowedExternalUrl('')).toBe(false);
  });
});
